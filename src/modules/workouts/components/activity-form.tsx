"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { berlinDateTimeParts, matchesSport, SPORT_CATEGORY_LABEL } from "@/modules/core/logic";
import type { Sport } from "@/modules/core/queries";

import { saveActivity, updateActivity } from "../actions";
import {
  ACTIVITY_MIN_DATE,
  activityDateError,
  activityPerformedAt,
  distanceToKmInput,
  FEELING_LABEL,
  parseDistanceKm,
  parseDurationMinutes,
} from "../logic";

// Wie beim Workout-Formular: zwei Wiederholungen nach 2 und 5 Sekunden, dieselbe ID bei jedem Versuch.
const RETRY_DELAYS_MS = [2000, 5000];
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type ActivityValues = {
  id: string;
  sportId: string;
  performedAt: string;
  durationMinutes: number | null;
  distanceM: number | null;
  elevationM: number | null;
  feeling: number | null;
  notes: string | null;
};

const FEELINGS = Object.entries(FEELING_LABEL).map(([value, label]) => ({ value: Number(value), label }));

/**
 * Aktivität eintragen oder ändern: Sportart, Datum, Dauer, je nach Sportart Distanz und Höhenmeter,
 * dazu Gefühl und Notiz. Drei Tipps reichen: Sportart, Dauer, Speichern.
 */
export function ActivityForm({
  sports,
  recentSportIds,
  existing,
}: {
  sports: readonly Sport[];
  recentSportIds: readonly string[];
  existing?: ActivityValues;
}) {
  const router = useRouter();
  // Die ID entsteht einmal je Formular: Ein erneutes Senden nach einem Abbruch legt nichts doppelt an.
  const [id] = useState(() => existing?.id ?? crypto.randomUUID());
  const today = berlinDateTimeParts(new Date()).date;
  const initialDate = existing ? berlinDateTimeParts(new Date(existing.performedAt)).date : today;

  const [sportId, setSportId] = useState<string | null>(existing?.sportId ?? recentSportIds[0] ?? null);
  const [showAll, setShowAll] = useState(recentSportIds.length === 0 && !existing);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(initialDate);
  const [hours, setHours] = useState(existing?.durationMinutes ? String(Math.floor(existing.durationMinutes / 60)) : "");
  const [minutes, setMinutes] = useState(existing?.durationMinutes ? String(existing.durationMinutes % 60) : "");
  const [distance, setDistance] = useState(
    existing?.distanceM ? distanceToKmInput(existing.distanceM) : "",
  );
  const [elevation, setElevation] = useState(existing?.elevationM ? String(existing.elevationM) : "");
  const [feeling, setFeeling] = useState<number | null>(existing?.feeling ?? null);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sport = sports.find((s) => s.id === sportId) ?? null;
  const recent = recentSportIds.flatMap((rid) => sports.filter((s) => s.id === rid));
  const grouped = useMemo(() => {
    const groups = new Map<string, Sport[]>();
    for (const s of sports.filter((s) => matchesSport(s, query))) {
      groups.set(s.category, [...(groups.get(s.category) ?? []), s]);
    }
    return [...groups.entries()];
  }, [sports, query]);

  function pick(id: string) {
    setSportId(id);
    setShowAll(false);
    setQuery("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    if (!sport) return setError("Wähl eine Sportart.");
    const durationMinutes = parseDurationMinutes(hours, minutes);
    if (durationMinutes === null) return setError("Gib eine Dauer zwischen 1 Minute und 24 Stunden ein.");
    const distanceM = sport.hasDistance ? parseDistanceKm(distance) : null;
    if (Number.isNaN(distanceM)) return setError("Gib die Distanz in Kilometern ein, zum Beispiel 8,5.");
    const elevationM = sport.hasElevation && elevation.trim() !== "" ? Number(elevation) : null;
    if (elevationM !== null && (!Number.isInteger(elevationM) || elevationM < 0 || elevationM > 20000)) {
      return setError("Gib die Höhenmeter als ganze Zahl ein.");
    }
    const dateError = activityDateError(date, today);
    if (dateError) return setError(dateError);
    const performedAt = activityPerformedAt({
      date,
      today,
      now: new Date(),
      existing: existing && { date: initialDate, performedAt: existing.performedAt },
    });
    if (!performedAt) return setError("Gib ein Datum ein.");

    setSaving(true);
    const values = {
      id,
      sportId: sport.id,
      performedAt,
      durationMinutes,
      distanceM,
      elevationM,
      feeling,
      notes: notes.trim() || null,
    };

    // Dieselbe ID bei jedem Versuch: Wiederholungen erzeugen kein Duplikat.
    let lastError = "Speichern fehlgeschlagen. Prüf deine Verbindung und versuch es erneut.";
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (attempt > 0) await wait(RETRY_DELAYS_MS[attempt - 1]);
      try {
        const result = existing ? await updateActivity(values) : await saveActivity(values);
        if (result.ok) {
          router.push(existing ? `/workouts/${result.data.id}` : "/");
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
    <form onSubmit={submit} className="max-w-xl space-y-8" noValidate>
      <fieldset className="space-y-3">
        <legend className="text-xl font-semibold">Sportart</legend>
        {recent.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Zuletzt">
            {recent.map((s) => (
              <li key={s.id}>
                <Chip selected={s.id === sportId} onClick={() => setSportId(s.id)}>{s.name}</Chip>
              </li>
            ))}
          </ul>
        )}
        {sport && !recent.some((s) => s.id === sport.id) && (
          <p>
            <Chip selected onClick={() => setShowAll(true)}>{sport.name}</Chip>
          </p>
        )}
        {!showAll ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            Alle Sportarten
          </button>
        ) : (
          <div className="space-y-4">
            <div className="max-w-sm space-y-2">
              <Label htmlFor="sport-search">Sportart suchen</Label>
              <Input
                id="sport-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Enter wählt bei genau einem Treffer diese Sportart und schickt das Formular nicht ab.
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const hits = sports.filter((s) => matchesSport(s, query));
                  if (hits.length === 1) pick(hits[0].id);
                }}
                placeholder="zum Beispiel Bouldern"
                autoComplete="off"
              />
            </div>
            {grouped.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Keine passende Sportart. Wähl „Sonstiges“, wenn deine fehlt.
              </p>
            ) : (
              grouped.map(([category, list]) => (
                <div key={category}>
                  <p className="text-muted-foreground mb-2 text-sm">
                    {SPORT_CATEGORY_LABEL[category as keyof typeof SPORT_CATEGORY_LABEL]}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {list.map((s) => (
                      <li key={s.id}>
                        <Chip selected={s.id === sportId} onClick={() => pick(s.id)}>
                          {s.name}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}
        {sport?.hasSets && !existing && (
          <p className="text-muted-foreground text-sm">
            Mit Übungen und Sätzen?{" "}
            {sport.id === "krafttraining" && (
              <>
                <Link href="/training" className="text-foreground underline underline-offset-4">
                  Mit Vorlage trainieren
                </Link>{" "}
                oder{" "}
              </>
            )}
            <Link href={`/workouts/neu?sport=${sport.id}`} className="text-foreground underline underline-offset-4">
              Sätze nachtragen
            </Link>
          </p>
        )}
      </fieldset>

      <div className="grid max-w-sm grid-cols-2 gap-3">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="date">Datum</Label>
          <Input id="date" type="date" value={date} min={ACTIVITY_MIN_DATE} max={today} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hours">Stunden</Label>
          <Input
            id="hours"
            inputMode="numeric"
            value={hours}
            onChange={(e) => setHours(e.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder="0"
            className="num text-right"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minutes">Minuten</Label>
          <Input
            id="minutes"
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder="45"
            className="num text-right"
          />
        </div>
        {sport?.hasDistance && (
          <div className="space-y-2">
            <Label htmlFor="distance">Distanz in km (optional)</Label>
            <Input
              id="distance"
              inputMode="decimal"
              value={distance}
              onChange={(e) => setDistance(e.target.value.replace(/[^\d,.]/g, "").slice(0, 7))}
              className="num text-right"
            />
          </div>
        )}
        {sport?.hasElevation && (
          <div className="space-y-2">
            <Label htmlFor="elevation">Höhenmeter (optional)</Label>
            <Input
              id="elevation"
              inputMode="numeric"
              value={elevation}
              onChange={(e) => setElevation(e.target.value.replace(/\D/g, "").slice(0, 5))}
              className="num text-right"
            />
          </div>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Wie anstrengend? (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {FEELINGS.map((f) => (
            <Chip key={f.value} selected={feeling === f.value} onClick={() => setFeeling(feeling === f.value ? null : f.value)}>
              {f.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="notes">Notiz (optional)</Label>
        <p className="text-muted-foreground text-sm">Sichtbar für alle, die deine Aktivitäten sehen dürfen.</p>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full md:w-auto" disabled={saving}>
        {saving ? "Wird gesendet" : existing ? "Änderungen speichern" : "Aktivität speichern"}
      </Button>
    </form>
  );
}
