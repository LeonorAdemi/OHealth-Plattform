"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/result";

import { deleteWorkout } from "../actions";

const initial: FormState = {};

// Löschen in zwei Schritten: erst nachfragen, dann endgültig löschen.
export function DeleteWorkout({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(deleteWorkout, initial);

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        className="-ml-4"
        onClick={() => setConfirming(true)}
      >
        Workout löschen
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <p>
        Das Workout und alle seine Sätze werden gelöscht. Das lässt sich nicht
        rückgängig machen.
      </p>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" variant="destructive" disabled={pending}>
          Endgültig löschen
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
