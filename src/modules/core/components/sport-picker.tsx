"use client";

import { useMemo, useState } from "react";

import { ChoiceChip } from "@/components/ui/choice-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { matchesSport, SPORT_CATEGORY_LABEL } from "../logic";
import type { Sport } from "../queries";

function SportChip({ sport, selected, onSelect }: { sport: Sport; selected: boolean; onSelect: () => void }) {
  return (
    <ChoiceChip selected={selected} onClick={onSelect}>
      {sport.name}
    </ChoiceChip>
  );
}

/**
 * Sportart wählen: oben die zuletzt genutzten als Chips, darunter „Alle Sportarten“ mit Suche und den
 * Gruppen des Katalogs. Für „Aktivität eintragen“ und „Training planen“. Was unter der Auswahl
 * stehen soll (etwa die Vorlagen bei Kraft), kommt als children.
 */
export function SportPicker({
  sports,
  recentSportIds,
  value,
  onChange,
  children,
}: {
  sports: readonly Sport[];
  recentSportIds: readonly string[];
  value: string | null;
  onChange: (sportId: string) => void;
  children?: React.ReactNode;
}) {
  const [showAll, setShowAll] = useState(recentSportIds.length === 0 && value === null);
  const [query, setQuery] = useState("");

  const sport = sports.find((s) => s.id === value) ?? null;
  const recent = recentSportIds.flatMap((rid) => sports.filter((s) => s.id === rid));
  const grouped = useMemo(() => {
    const groups = new Map<string, Sport[]>();
    for (const s of sports.filter((s) => matchesSport(s, query))) {
      groups.set(s.category, [...(groups.get(s.category) ?? []), s]);
    }
    return [...groups.entries()];
  }, [sports, query]);

  return (
    <fieldset className="space-y-3">
      <legend className="text-xl font-semibold">Sportart</legend>
      {recent.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Zuletzt">
          {recent.map((s) => (
            <li key={s.id}>
              <SportChip sport={s} selected={s.id === value} onSelect={() => onChange(s.id)} />
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
              onKeyDown={(e) => {
                // Enter wählt den ersten Treffer, statt das Formular abzuschicken.
                if (e.key !== "Enter") return;
                e.preventDefault();
                const first = grouped[0]?.[1][0];
                if (first) {
                  onChange(first.id);
                  setShowAll(false);
                  setQuery("");
                }
              }}
            />
          </div>
          {grouped.length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine passende Sportart. Wähl „Sonstiges“, wenn deine fehlt.</p>
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
                        selected={s.id === value}
                        onSelect={() => {
                          onChange(s.id);
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
      {children}
    </fieldset>
  );
}
