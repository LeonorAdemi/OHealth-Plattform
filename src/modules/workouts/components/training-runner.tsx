"use client";

import { Check, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExerciseMeasure } from "@/lib/domain";
import { cn } from "@/lib/utils";

import { saveTraining } from "../actions";
import {
  APP_TIME_ZONE,
  buildTrainingPayload,
  completeSet,
  endRest,
  extraTrainingEntry,
  formatClock,
  formatLastSets,
  parseTrainingSession,
  reopenSet,
  restElapsed,
  type SearchableExercise,
  type StoredSet,
  type TrainingEntry,
  type TrainingSession,
  TRAINING_KEY,
} from "../logic";
import { ExercisePicker } from "./exercise-picker";
import { ExerciseSketch } from "./exercise-sketch";

type Exercise = SearchableExercise & { measure: ExerciseMeasure };

// Das laufende Training bleibt auf dem Gerät gespeichert, bis der Server das Speichern
// bestätigt hat (docs/ENGINEERING.md, Abschnitt 6), auch über Neuladen und Sperrbildschirm.
const RETRY_DELAYS_MS = [2000, 5000];
const SAVE_FAILED = "Speichern fehlgeschlagen. Prüf deine Verbindung und versuch es erneut.";

const VALUE_LABEL: Record<ExerciseMeasure, string> = {
  weight_reps: "Wiederholungen",
  duration: "Sekunden",
  distance: "Meter",
};

const dayFormat = new Intl.DateTimeFormat("de-DE", { timeZone: APP_TIME_ZONE, day: "numeric", month: "short" });

function readSession(): TrainingSession | null {
  try {
    return parseTrainingSession(window.localStorage.getItem(TRAINING_KEY));
  } catch {
    return null;
  }
}

function writeSession(session: TrainingSession | null) {
  try {
    if (session) window.localStorage.setItem(TRAINING_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(TRAINING_KEY);
  } catch {
    // Ohne lokalen Speicher läuft das Training weiter, nur ohne Sicherung auf dem Gerät.
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type LastSets = Record<string, { performedAt: string; sets: StoredSet[] }>;

/**
 * Laufendes Training aus einer Vorlage. Werte sind vorbelegt und änderbar. Abgehakte Sätze
 * werden gespeichert, die Pause zwischen ihnen und die Gesamtdauer misst die App.
 */
export function TrainingRunner({
  template,
  plan,
  exercises,
  lastSets,
}: {
  template: { id: string; versionId: string; name: string };
  plan: TrainingEntry[];
  exercises: readonly Exercise[];
  lastSets: LastSets;
}) {
  const router = useRouter();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [other, setOther] = useState<TrainingSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fresh(): TrainingSession {
    return {
      version: 1,
      id: crypto.randomUUID(),
      templateId: template.id,
      templateVersionId: template.versionId,
      title: template.name,
      startedAt: Date.now(),
      rest: null,
      entries: plan,
    };
  }

  // Ein gespeichertes Training kann erst im Browser gelesen werden.
  useEffect(() => {
    const stored = readSession();
    if (stored && stored.templateId !== template.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Laden aus localStorage nach dem Hydrieren
      setOther(stored);
      return;
    }
    const next = stored ?? fresh();
    writeSession(next);
    setSession(next);
    // plan und template ändern sich während der Lebensdauer der Ansicht nicht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Uhr für Dauer und Pause. Gerechnet wird mit Zeitstempeln, daher stimmt die Anzeige
  // auch nach dem Sperrbildschirm sofort wieder.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Bildschirm während des Trainings anlassen, wo der Browser das kann.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, []);

  if (other) {
    return (
      <div className="max-w-xl space-y-6">
        <p>
          Auf diesem Gerät läuft noch das Training „{other.title}“ seit{" "}
          <span className="num">{formatClock((now - other.startedAt) / 1000)}</span>.
        </p>
        <div className="flex flex-col gap-3 md:flex-row">
          <Button asChild className="w-full md:w-auto">
            <Link href={other.templateId ? `/training/${other.templateId}` : "/training"}>Training fortsetzen</Link>
          </Button>
          <Button
            variant="outline"
            className="w-full md:w-auto"
            onClick={() => {
              const next = fresh();
              writeSession(next);
              setOther(null);
              setSession(next);
            }}
          >
            Verwerfen und neu starten
          </Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <p className="text-muted-foreground">Lädt</p>;
  }

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const rest = restElapsed(session, now);
  const resting = session.rest !== null && session.rest.endedAt === null;
  const doneCount = session.entries.reduce((sum, e) => sum + e.sets.filter((s) => s.doneAt !== null).length, 0);

  function update(next: TrainingSession) {
    setSession(next);
    writeSession(next);
    setError(null);
  }

  function updateEntry(index: number, entry: TrainingEntry | null) {
    if (!session) return;
    const entries = entry
      ? session.entries.map((e, i) => (i === index ? entry : e))
      : session.entries.filter((_, i) => i !== index);
    update({ ...session, entries });
  }

  function patchSet(entryIndex: number, setIndex: number, patch: { value?: string; weight?: string }) {
    if (!session) return;
    const entry = session.entries[entryIndex];
    updateEntry(entryIndex, {
      ...entry,
      sets: entry.sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s)),
    });
  }

  function toggleSet(entryIndex: number, setIndex: number) {
    if (!session) return;
    const set = session.entries[entryIndex].sets[setIndex];
    update(set.doneAt === null ? completeSet(session, entryIndex, setIndex, Date.now()) : reopenSet(session, entryIndex, setIndex));
  }

  async function finish() {
    if (!session || saving) return;
    const payload = buildTrainingPayload(session.entries);
    if (!payload.ok) {
      setError(payload.error);
      return;
    }

    setSaving(true);
    setError(null);
    // Das Ende steht mit dem ersten Tippen fest, auch wenn das Speichern mehrere Versuche braucht.
    const input = {
      id: session.id,
      title: session.title,
      templateVersionId: session.templateVersionId,
      startedAt: new Date(session.startedAt).toISOString(),
      finishedAt: new Date(Math.max(Date.now(), session.startedAt)).toISOString(),
      sets: payload.sets,
    };
    let lastError = SAVE_FAILED;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (attempt > 0) await wait(RETRY_DELAYS_MS[attempt - 1]);
      try {
        const result = await saveTraining(input);
        if (result.ok) {
          writeSession(null);
          router.push(`/workouts/${result.data.id}`);
          router.refresh();
          return;
        }
        lastError = result.error;
      } catch {
        // Netzwerkfehler: nächster Versuch
      }
    }

    setSaving(false);
    setError(lastError);
  }

  return (
    <div className="max-w-xl">
      <p className="text-muted-foreground text-sm">
        {session.title} · <span className="num">{formatClock((now - session.startedAt) / 1000)}</span>
      </p>
      <p className="num-display text-grosszahl mt-2" aria-live="off">
        {resting && rest !== null ? formatClock(rest) : formatClock((now - session.startedAt) / 1000)}
      </p>
      <div className="mt-1 flex min-h-11 items-center gap-4">
        <p>{resting ? "Pause" : "Trainingsdauer"}</p>
        {resting && (
          <Button variant="outline" size="sm" onClick={() => update(endRest(session, Date.now()))}>
            Pause beenden
          </Button>
        )}
      </div>

      <div className="mt-8 space-y-10">
        {session.entries.map((entry, entryIndex) => {
          const exercise = byId.get(entry.exerciseId);
          const name = exercise?.name ?? "Übung";
          const withWeight = entry.measure === "weight_reps";
          const last = lastSets[entry.exerciseId];

          return (
            <section key={`${entry.exerciseId}-${entryIndex}`} aria-label={name}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="min-w-0 truncate text-xl font-semibold">{name}</h2>
                <Button variant="ghost" size="sm" onClick={() => updateEntry(entryIndex, null)}>
                  Entfernen
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">
                {!entry.fromTemplate && "Nur in diesem Training · "}
                {last ? (
                  <>
                    Zuletzt {dayFormat.format(new Date(last.performedAt))}:{" "}
                    <span className="num">{formatLastSets(last.sets)}</span>
                  </>
                ) : (
                  "Noch kein früheres Training"
                )}
                {" · "}
                <Link href={`/uebungen/${entry.exerciseId}`} className="underline underline-offset-4">
                  Verlauf
                </Link>
              </p>

              {exercise && <ExerciseSketch name={exercise.name} />}

              <div className="text-muted-foreground mt-3 flex gap-3 text-sm">
                <span className="w-6" />
                <span className="flex-1 text-right">{VALUE_LABEL[entry.measure]}</span>
                {withWeight && <span className="flex-1 text-right">Gewicht in kg</span>}
                <span className="w-11 md:w-10" />
                <span className="w-11 md:w-10" />
              </div>

              {entry.sets.map((set, setIndex) => {
                const done = set.doneAt !== null;
                const label = `Satz ${setIndex + 1}`;
                return (
                  <div key={setIndex}>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-muted-foreground w-6 text-sm">{setIndex + 1}</span>
                      <Input
                        inputMode={entry.measure === "distance" ? "decimal" : "numeric"}
                        aria-label={`${label}: ${VALUE_LABEL[entry.measure]}`}
                        className={cn("num-display flex-1 text-right text-xl", done && "text-muted-foreground")}
                        value={set.value}
                        onChange={(e) => patchSet(entryIndex, setIndex, { value: e.target.value })}
                      />
                      {withWeight && (
                        <Input
                          inputMode="decimal"
                          aria-label={`${label}: Gewicht in kg`}
                          className={cn("num-display flex-1 text-right text-xl", done && "text-muted-foreground")}
                          value={set.weight}
                          onChange={(e) => patchSet(entryIndex, setIndex, { weight: e.target.value })}
                        />
                      )}
                      <Button
                        variant={done ? "outline" : "ghost"}
                        size="icon"
                        aria-pressed={done}
                        aria-label={done ? `${label} wieder öffnen` : `${label} abhaken`}
                        onClick={() => toggleSet(entryIndex, setIndex)}
                      >
                        <Check strokeWidth={done ? 2.5 : 1.5} className={done ? "" : "text-muted-foreground"} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${label} entfernen`}
                        disabled={done}
                        onClick={() =>
                          updateEntry(entryIndex, { ...entry, sets: entry.sets.filter((_, i) => i !== setIndex) })
                        }
                      >
                        <X strokeWidth={1.5} />
                      </Button>
                    </div>
                    {done && set.restSeconds !== null && (
                      <p className="text-muted-foreground mt-1 pl-9 text-sm">
                        Pause davor <span className="num">{formatClock(set.restSeconds)}</span>
                      </p>
                    )}
                  </div>
                );
              })}

              <Button
                variant="ghost"
                size="sm"
                className="mt-2 -ml-3"
                onClick={() => {
                  const previous = entry.sets.at(-1);
                  updateEntry(entryIndex, {
                    ...entry,
                    // Der neue Satz übernimmt die Werte des vorherigen.
                    sets: [
                      ...entry.sets,
                      { value: previous?.value ?? "", weight: previous?.weight ?? "", doneAt: null, restSeconds: null },
                    ],
                  });
                }}
              >
                <Plus strokeWidth={1.5} />
                Satz hinzufügen
              </Button>
            </section>
          );
        })}

        <ExercisePicker
          exercises={exercises}
          onPick={(exerciseId) => {
            const measure = byId.get(exerciseId)?.measure ?? "weight_reps";
            update({
              ...session,
              entries: [...session.entries, extraTrainingEntry(exerciseId, measure, lastSets[exerciseId]?.sets)],
            });
          }}
        />
      </div>

      <div className="mt-10 space-y-3">
        <p className="text-muted-foreground text-sm">
          {doneCount === 1 ? "1 Satz abgehakt." : `${doneCount} Sätze abgehakt.`} Gespeichert werden nur
          abgehakte Sätze. Was du hier änderst oder hinzufügst, ändert deine Vorlage nicht.
        </p>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button className="w-full md:w-auto" disabled={saving} onClick={finish}>
          {saving ? "Wird gesendet" : "Workout beenden"}
        </Button>
      </div>

      <div className="mt-6">
        {!discarding ? (
          <Button variant="ghost" className="-ml-4" disabled={saving} onClick={() => setDiscarding(true)}>
            Training verwerfen
          </Button>
        ) : (
          <div className="space-y-3">
            <p>Das Training wird nicht gespeichert. Das lässt sich nicht rückgängig machen.</p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={() => {
                  writeSession(null);
                  router.push(`/vorlagen/${template.id}`);
                }}
              >
                Verwerfen
              </Button>
              <Button variant="outline" onClick={() => setDiscarding(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
