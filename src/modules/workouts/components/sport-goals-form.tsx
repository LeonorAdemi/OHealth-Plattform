"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { SportDot } from "@/modules/core/components/sport-dot";
import type { SportCategory } from "@/modules/core/logic";
import type { FormState } from "@/lib/result";

import { saveSportGoals } from "../actions";

const initial: FormState = {};
const MAX_GOALS = 5;

/**
 * Vorhaben je Sportart: je Zeile Sportart und „− 3× +“, 0× entfernt sie beim Speichern. Weitere
 * Sportarten aus dem Katalog lassen sich hinzufügen, höchstens fünf.
 */
export function SportGoalsForm({
  goals,
  sports,
}: {
  goals: readonly { sportId: string; times: number }[];
  sports: readonly { id: string; name: string; category: SportCategory }[];
}) {
  const [state, action, pending] = useActionState(saveSportGoals, initial);
  const [rows, setRows] = useState(goals.map((g) => ({ ...g })));
  const byId = new Map(sports.map((s) => [s.id, s]));
  const kept = rows.filter((r) => r.times > 0);
  const available = sports.filter((s) => !rows.some((r) => r.sportId === s.id));

  return (
    <form action={action} className="space-y-4">
      <input
        type="hidden"
        name="goals"
        value={JSON.stringify(kept.map((r) => ({ sport_id: r.sportId, times: r.times })))}
      />
      {rows.length > 0 ? (
        <ul>
          {rows.map((row) => {
            const sport = byId.get(row.sportId);
            return (
              <li key={row.sportId} className="flex min-h-14 items-center justify-between gap-4 border-b">
                <span className="flex items-center gap-2">
                  <SportDot category={sport?.category} />
                  {sport?.name ?? row.sportId}
                </span>
                <Stepper
                  label={`${sport?.name ?? row.sportId} pro Woche`}
                  value={row.times}
                  onChange={(n) =>
                    setRows((current) => current.map((r) => (r.sportId === row.sportId ? { ...r, times: n } : r)))
                  }
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Noch keine Vorhaben.</p>
      )}

      {rows.length < MAX_GOALS ? (
        <label className="block max-w-xs space-y-1 text-sm">
          <span className="block font-medium">Sportart hinzufügen</span>
          <select
            className="border-input focus-visible:outline-ring h-11 w-full rounded-lg border bg-transparent px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 md:h-10"
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (id) setRows((current) => [...current, { sportId: id, times: 1 }]);
            }}
          >
            <option value="">Sportart wählen</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-muted-foreground text-sm">Fünf Sportarten, mehr gehen nicht.</p>
      )}

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state.message && !pending && (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="outline" disabled={pending}>
        Vorhaben speichern
      </Button>
    </form>
  );
}
