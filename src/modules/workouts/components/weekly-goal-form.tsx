"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import type { FormState } from "@/lib/result";

import { saveWeeklyGoal } from "../actions";
import { DEFAULT_WEEKLY_GOAL, WEEKLY_GOAL_OPTIONS } from "../logic";

const initial: FormState = {};

/** Wochenziel in Trainingstagen als Auswahl-Chips, gespeichert mit einem Umriss-Button. */
export function WeeklyGoalForm({ goal }: { goal: number | null }) {
  const [state, action, pending] = useActionState(saveWeeklyGoal, initial);
  const [days, setDays] = useState(goal ?? DEFAULT_WEEKLY_GOAL);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="days" value={days} />
      <div role="group" aria-label="Wochenziel" className="flex flex-wrap gap-2">
        {WEEKLY_GOAL_OPTIONS.map((n) => (
          <ChoiceChip key={n} selected={days === n} onClick={() => setDays(n)}>
            {n === 1 ? "1 Tag" : `${n} Tage`}
          </ChoiceChip>
        ))}
      </div>
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
        Wochenziel speichern
      </Button>
    </form>
  );
}
