"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/result";

import { deleteAccount } from "../actions";

const initial: FormState = {};

// Konto löschen in zwei Schritten: erst die Folgen zeigen, dann endgültig löschen.
export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, initial);

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        className="-ml-4"
        onClick={() => setConfirming(true)}
      >
        Konto löschen
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="confirm" value="yes" />
      <p>Wenn du dein Konto löschst, passiert Folgendes:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Dein Profil, alle deine Workouts und Sätze werden gelöscht.</li>
        <li>
          Du verlässt alle Gruppen und verschwindest aus ihren Ranglisten.
        </li>
        <li>
          Gruppen, die du allein verwaltest, gehen an das dienstälteste Mitglied
          über. Coaching-Gruppen, die du leitest, und Gruppen ohne weitere
          Mitglieder werden gelöscht.
        </li>
      </ul>
      <p>Das lässt sich nicht rückgängig machen.</p>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="destructive" disabled={pending}>
          Konto endgültig löschen
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
