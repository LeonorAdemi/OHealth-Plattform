"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExerciseMeasure } from "@/lib/domain";

import { saveWorkout, updateWorkout } from "../actions";
import { buildSetsPayload, type DraftSet, type SearchableExercise } from "../logic";
import { ExercisePicker } from "./exercise-picker";
import { ExerciseSketch } from "./exercise-sketch";

type Exercise = SearchableExercise & { measure: ExerciseMeasure };
type Entry = { exerciseId: string; sets: DraftSet[] };
export type Draft = { id: string; title: string; entries: Entry[] };

// Neues Workout und jede Korrektur haben ihren eigenen Entwurf auf dem Gerät.
const NEW_DRAFT_KEY = "ohealth:workout-draft";
const editDraftKey = (id: string) => `ohealth:workout-edit:${id}`;
const RETRY_DELAYS_MS = [2000, 5000];

const VALUE_LABEL: Record<ExerciseMeasure, string> = {
  weight_reps: "Wiederholungen",
  duration: "Sekunden",
  distance: "Meter",
};

function emptyDraft(): Draft {
  return { id: crypto.randomUUID(), title: "", entries: [] };
}

function readDraft(key: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: Draft | null) {
  try {
    if (draft) window.localStorage.setItem(key, JSON.stringify(draft));
    else window.localStorage.removeItem(key);
  } catch {
    // Ohne lokalen Speicher läuft das Formular weiter, nur ohne Entwurfssicherung.
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Formular für ein neues Workout oder, mit existing, für die Korrektur eines gespeicherten.
 * existing kommt vom Server und ist der Stand, mit dem die Korrektur beginnt.
 */
export function WorkoutForm({
  exercises,
  existing,
}: {
  exercises: readonly Exercise[];
  existing?: Draft;
}) {
  const router = useRouter();
  const draftKey = existing ? editDraftKey(existing.id) : NEW_DRAFT_KEY;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Der Entwurf lebt auf dem Gerät, bis der Server das Speichern bestätigt hat
  // (docs/ENGINEERING.md, Abschnitt 6). Er kann erst im Browser gelesen werden.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Laden aus localStorage nach dem Hydrieren
    setDraft(readDraft(draftKey) ?? existing ?? emptyDraft());
    // existing ändert sich während der Lebensdauer des Formulars nicht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  function update(next: Draft) {
    setDraft(next);
    writeDraft(draftKey, next);
    setError(null);
  }

  if (!draft) {
    return <p className="text-muted-foreground">Lädt</p>;
  }

  const byId = new Map(exercises.map((e) => [e.id, e]));

  function addExercise(exerciseId: string) {
    if (!draft) return;
    update({
      ...draft,
      entries: [...draft.entries, { exerciseId, sets: [{ value: "", weight: "" }] }],
    });
  }

  function updateEntry(index: number, entry: Entry | null) {
    if (!draft) return;
    const entries = entry
      ? draft.entries.map((e, i) => (i === index ? entry : e))
      : draft.entries.filter((_, i) => i !== index);
    update({ ...draft, entries });
  }

  async function submit() {
    if (!draft || saving) return;

    const payload = buildSetsPayload(
      draft.entries.map((entry) => ({
        ...entry,
        measure: byId.get(entry.exerciseId)?.measure ?? "weight_reps",
      })),
    );
    if (!payload.ok) {
      setError(payload.error);
      return;
    }

    setSaving(true);
    setError(null);

    // Dieselbe Workout-ID bei jedem Versuch: Wiederholungen erzeugen kein Duplikat.
    const input = { id: draft.id, title: draft.title, sets: payload.sets };
    let lastError = "Speichern fehlgeschlagen. Prüf deine Verbindung und versuch es erneut.";

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (attempt > 0) await wait(RETRY_DELAYS_MS[attempt - 1]);
      try {
        const result = existing ? await updateWorkout(input) : await saveWorkout(input);
        if (result.ok) {
          writeDraft(draftKey, null);
          router.push(existing ? `/workouts/${existing.id}` : "/");
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
    <div className="max-w-xl space-y-8">
      <div className="space-y-2">
        <Label htmlFor="title">Name des Workouts (optional)</Label>
        <Input
          id="title"
          value={draft.title}
          maxLength={80}
          placeholder="Oberkörper"
          onChange={(e) => update({ ...draft, title: e.target.value })}
        />
      </div>

      {draft.entries.map((entry, entryIndex) => {
        const exercise = byId.get(entry.exerciseId);
        const measure = exercise?.measure ?? "weight_reps";
        const withWeight = measure === "weight_reps";

        return (
          <section key={entryIndex} aria-label={exercise?.name ?? "Übung"}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{exercise?.name ?? "Übung"}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateEntry(entryIndex, null)}
              >
                Entfernen
              </Button>
            </div>

            {exercise && <ExerciseSketch name={exercise.name} />}

            <div className="text-muted-foreground mt-3 flex gap-3 text-sm">
              <span className="w-6" />
              <span className="flex-1 text-right">{VALUE_LABEL[measure]}</span>
              {withWeight && <span className="flex-1 text-right">Gewicht in kg</span>}
              <span className="w-11 md:w-10" />
            </div>

            {entry.sets.map((set, setIndex) => (
              <div key={setIndex} className="mt-2 flex items-center gap-3">
                <span className="text-muted-foreground w-6 text-sm">{setIndex + 1}</span>
                <Input
                  inputMode={measure === "distance" ? "decimal" : "numeric"}
                  aria-label={`Satz ${setIndex + 1}: ${VALUE_LABEL[measure]}`}
                  className="num-display flex-1 text-right text-xl"
                  value={set.value}
                  onChange={(e) =>
                    updateEntry(entryIndex, {
                      ...entry,
                      sets: entry.sets.map((s, i) =>
                        i === setIndex ? { ...s, value: e.target.value } : s,
                      ),
                    })
                  }
                />
                {withWeight && (
                  <Input
                    inputMode="decimal"
                    aria-label={`Satz ${setIndex + 1}: Gewicht in kg`}
                    className="num-display flex-1 text-right text-xl"
                    value={set.weight}
                    onChange={(e) =>
                      updateEntry(entryIndex, {
                        ...entry,
                        sets: entry.sets.map((s, i) =>
                          i === setIndex ? { ...s, weight: e.target.value } : s,
                        ),
                      })
                    }
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Satz ${setIndex + 1} entfernen`}
                  onClick={() =>
                    updateEntry(entryIndex, {
                      ...entry,
                      sets: entry.sets.filter((_, i) => i !== setIndex),
                    })
                  }
                >
                  <X strokeWidth={1.5} />
                </Button>
              </div>
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="mt-2 -ml-3"
              onClick={() =>
                updateEntry(entryIndex, {
                  ...entry,
                  // Der neue Satz übernimmt die Werte des vorherigen.
                  sets: [...entry.sets, { ...(entry.sets.at(-1) ?? { value: "", weight: "" }) }],
                })
              }
            >
              <Plus strokeWidth={1.5} />
              Satz hinzufügen
            </Button>
          </section>
        );
      })}

      <ExercisePicker exercises={exercises} onPick={addExercise} />

      <div className="space-y-3">
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button className="w-full md:w-auto" disabled={saving} onClick={submit}>
          {saving ? "Wird gesendet" : existing ? "Änderungen speichern" : "Workout speichern"}
        </Button>
      </div>
    </div>
  );
}
