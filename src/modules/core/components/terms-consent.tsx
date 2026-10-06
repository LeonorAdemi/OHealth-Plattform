"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { MIN_AGE } from "@/lib/legal";
import type { FormState } from "@/lib/result";

import { acceptTerms } from "../actions";

const initial: FormState = {};

/** Pflicht-Häkchen: Mindestalter und Nutzungsbedingungen (Feld „terms“). */
export function TermsCheckbox() {
  return (
    <label className="flex min-h-11 items-start gap-3">
      <input type="checkbox" name="terms" required className="accent-primary mt-1 size-5 shrink-0" />
      <span className="text-sm">
        Ich bin mindestens {MIN_AGE} Jahre alt und akzeptiere die{" "}
        <Link href="/nutzungsbedingungen" target="_blank" className="underline underline-offset-4">
          Nutzungsbedingungen<span className="sr-only"> (öffnet in neuem Tab)</span>
        </Link>
        .
      </span>
    </label>
  );
}

/** Zustimmung für Konten, die vor den Nutzungsbedingungen oder einer neuen Fassung entstanden sind. */
export function AcceptTermsForm() {
  const [state, action, pending] = useActionState(acceptTerms, initial);
  return (
    <form action={action} className="space-y-5">
      <TermsCheckbox />
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        Weiter
      </Button>
    </form>
  );
}
