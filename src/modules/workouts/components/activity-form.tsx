"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { berlinDateTimeParts, berlinLocalToDate, matchesSport, SPORT_CATEGORY_LABEL } from "@/modules/core/logic";
import type { Sport } from "@/modules/core/queries";

import { saveActivity, updateActivity } from "../actions";
import { FEELING_LABEL, parseDistanceKm, parseDurationMinutes } from "../logic";

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

function SportChip({ sport, selected, onSelect }: { sport: Sport; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors duration-150 ease-out md:min-h-9",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        selected ? "border-foreground text-foreground font-medium" : "border-input text-muted-foreground hover:bg-accent",
      )}
    >
      {selected && <Check size={16} strokeWidth={1.5} aria-hidden />}
      {sport.name}
    </button>
  );
}

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
    existing?.distanceM ? String(existing.distanceM / 1000).replace(".", ",") : "",
  );
  const [elevation, setElevation] = useState(existing?.elevationM ? String(existing.elevationM) : "");
  const [feeling, setFeeling] = useState<number | null>(existing?.feeling ?? null);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failedToSend, setFailedToSend] = useState(false);

  const sport = sports.find((s) => s.id === sportId) ?? null;
  const recent = recentSportIds.flatMap((rid) => sports.filter((s) => s.id === rid));
  const grouped = useMemo(() => {
    const groups = new Map<string, Sport[]>();
    for (const s of sports.filter((s) => matchesSport(s, query))) {
      groups.set(s.category, [...(groups.get(s.category) ?? []), s]);
    }
    return [...groups.entries()];
  }, [sports, query]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
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
    if (date > today) return setError("Eine Aktivität liegt nicht in der Zukunft.");

    // Heute: jetzt. Frühere Tage: mittags, damit der Tag in deutscher Zeit sicher stimmt.
    const performedAt =
      existing && date === initialDate
        ? existing.performedAt
        : date === today
          ? new Date().toISOString()
          : (berlinLocalToDate(date, "12:00") ?? new Date()).toISOString();

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
    setSaving(true);
    // Ohne Netz (oder bei einem Absturz auf dem Server) wirft der Aufruf, statt ein Ergebnis zu
    // liefern. Die Eingaben bleiben stehen, und ein neuer Versuch legt dank der ID vom Gerät nichts
    // doppelt an.
    const result = await (existing ? updateActivity(values) : saveActivity(values)).catch(() => null);
    setSaving(false);
    setFailedToSend(!result);
    if (!result) {
      return setError("Das hat nicht geklappt. Deine Angaben sind noch da. Prüf deine Verbindung und sende erneut.");
    }
    if (!result.ok) return setError(result.error);
    router.push(existing ? `/workouts/${result.data.id}` : "/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-8" noValidate>
      <fieldset className="space-y-3">
        <legend className="text-xl font-semibold">Sportart</legend>
        {recent.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Zuletzt">
            {recent.map((s) => (
              <li key={s.id}>
                <SportChip sport={s} selected={s.id === sportId} onSelect={() => setSportId(s.id)} />
              </li>
            ))}
          </ul>
        )}
        {sport && !recent.some((s) => s.id === sport.id) && (
          <p>
            <SportChip sport={sport} selected onSelect={() => setShowAll(true)} />
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
                        <SportChip
                          sport={s}
                          selected={s.id === sportId}
                          onSelect={() => {
                            setSportId(s.id);
                            setShowAll(false);
                            setQuery("");
                          }}
                        />
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
            <Link href="/training" className="text-foreground underline underline-offset-4">
              Mit Vorlage trainieren
            </Link>{" "}
            oder{" "}
            <Link href="/workouts/neu" className="text-foreground underline underline-offset-4">
              Sätze nachtragen
            </Link>
          </p>
        )}
      </fieldset>

      <div className="grid max-w-sm grid-cols-2 gap-3">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="date">Datum</Label>
          <Input id="date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required />
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
            autoFocus={!existing && Boolean(sportId)}
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
            <button
              key={f.value}
              type="button"
              aria-pressed={feeling === f.value}
              onClick={() => setFeeling(feeling === f.value ? null : f.value)}
              className={cn(
                "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm transition-colors duration-150 ease-out md:min-h-9",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                feeling === f.value
                  ? "border-foreground text-foreground font-medium"
                  : "border-input text-muted-foreground hover:bg-accent",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="notes">Notiz (optional)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full md:w-auto" disabled={saving}>
        {saving
          ? "Wird gesendet"
          : failedToSend
            ? "Erneut senden"
            : existing
              ? "Änderungen speichern"
              : "Aktivität speichern"}
      </Button>
    </form>
  );
}
