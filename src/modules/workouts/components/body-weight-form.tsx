"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/result";

import { deleteBodyWeight, saveBodyWeight } from "../actions";
import { formatNumber } from "../logic";

const initial: FormState = {};

/**
 * Körpergewicht für Kalorien: Zahl in kg und ausdrückliche Einwilligung. Gespeichert wird nur mit
 * Häkchen; „Gewicht löschen“ nimmt Gewicht und Einwilligung zurück.
 */
export function BodyWeightForm({ weightKg }: { weightKg: number | null }) {
  const [saveState, save, saving] = useActionState(saveBodyWeight, initial);
  const [deleteState, remove, deleting] = useActionState(deleteBodyWeight, initial);

  return (
    <div className="space-y-4">
      {/* Nach Speichern oder Löschen neu aufgebaut, damit das Feld den gespeicherten Stand zeigt */}
      <form key={weightKg ?? "leer"} action={save} className="space-y-4">
        <div className="max-w-40 space-y-2">
          <Label htmlFor="gewicht">Körpergewicht in kg</Label>
          <Input
            id="gewicht"
            name="weight"
            inputMode="decimal"
            defaultValue={weightKg ? formatNumber(weightKg, weightKg % 1 === 0 ? 0 : 1) : ""}
            placeholder="72,5"
            className="num text-right"
          />
        </div>
        <label className="flex max-w-xl items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consent"
            defaultChecked={weightKg !== null}
            className="accent-foreground mt-0.5 size-5 shrink-0"
          />
          <span>
            Ich willige ein, dass OHealth mein Gewicht speichert, um Kalorien zu berechnen. Nur ich sehe es, eine
            verbundene KI nicht. Ich kann es jederzeit löschen.
          </span>
        </label>
        <Button type="submit" variant="outline" disabled={saving || deleting}>
          {saving ? "Wird gespeichert" : "Gewicht speichern"}
        </Button>
        <Status state={saveState} pending={saving} />
      </form>

      {weightKg !== null && (
        <form action={remove}>
          <Button type="submit" variant="ghost" disabled={saving || deleting} className="-ml-4">
            {deleting ? "Wird gelöscht" : "Gewicht löschen"}
          </Button>
          <Status state={deleteState} pending={deleting} />
        </form>
      )}
    </div>
  );
}

function Status({ state, pending }: { state: FormState; pending: boolean }) {
  if (pending) return null;
  if (state.error) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {state.error}
      </p>
    );
  }
  return state.message ? (
    <p role="status" className="text-sm">
      {state.message}
    </p>
  ) : null;
}
