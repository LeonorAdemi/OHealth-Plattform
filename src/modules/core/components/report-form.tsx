"use client";

import { useActionState, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/result";

import { removeMember, report } from "../actions";
import { REPORT_CATEGORIES, REPORT_CATEGORY_LABEL, type ReportCategory, type ReportTarget } from "../logic";

const initial: FormState = {};

/**
 * Melden mit Art und optional einem Satz dazu, aufklappbar hinter einem Link. Nach dem Senden steht
 * nur noch die Bestätigung da.
 */
export function ReportForm({ target, id, label }: { target: ReportTarget; id: string; label: string }) {
  const [state, action, pending] = useActionState(report, initial);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const reasonId = useId();
  const groupId = useId();

  if (state.message) {
    return (
      <p role="status" className="text-sm">
        {state.message}
      </p>
    );
  }

  return (
    <details>
      <summary className="text-muted-foreground min-h-11 cursor-pointer py-2 text-sm underline underline-offset-4">
        {label}
      </summary>
      <form action={action} className="mt-2 max-w-xl space-y-3">
        <input type="hidden" name="target" value={target} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="category" value={category ?? ""} />
        <div role="group" aria-labelledby={groupId} className="space-y-2">
          <p id={groupId} className="text-sm font-medium">
            Was passt nicht?
          </p>
          <div className="flex flex-wrap gap-2">
            {REPORT_CATEGORIES.map((c) => (
              <ChoiceChip key={c} selected={category === c} onClick={() => setCategory(c)}>
                {REPORT_CATEGORY_LABEL[c]}
              </ChoiceChip>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={reasonId}>Was genau? (freiwillig)</Label>
          <Input id={reasonId} name="reason" maxLength={500} />
        </div>
        {state.error && (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
        <Button type="submit" variant="outline" disabled={pending || !category}>
          Meldung senden
        </Button>
      </form>
    </details>
  );
}

/** Mitglied entfernen mit Rückfrage. Es kann danach 30 Tage lang nicht wieder beitreten. */
export function RemoveMember({ groupId, userId, name }: { groupId: string; userId: string; name: string }) {
  const [state, action, pending] = useActionState(removeMember, initial);
  const [confirming, setConfirming] = useState(false);

  if (state.message) {
    return (
      <p role="status" className="text-muted-foreground text-sm">
        {state.message}
      </p>
    );
  }
  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        aria-label={`${name} entfernen`}
      >
        Entfernen
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="userId" value={userId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending}
        aria-label={`${name} wirklich entfernen`}
        // Der Button „Entfernen“ verschwindet; der Fokus bleibt an dieser Stelle
        autoFocus
      >
        Wirklich entfernen
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Abbrechen
      </Button>
      {state.error && (
        <p role="alert" className="text-destructive w-full text-right text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}
