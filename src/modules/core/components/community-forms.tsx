"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/result";

import {
  acceptInvite,
  createCommunity,
  joinPublicCommunity,
  joinWithCode,
  leaveCommunity,
  reportCommunity,
} from "../actions";
import { COMMUNITY_KIND_HINT, SPORT_SUGGESTIONS, type CommunityKind } from "../logic";

const initial: FormState = {};

function Feedback({ state }: { state: FormState }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      )}
    </>
  );
}

/** Neue Community: eine Frage entscheidet die Privatsphäre, wer darf rein. */
export function CreateCommunityForm() {
  const [state, action, pending] = useActionState(createCommunity, initial);
  const [kind, setKind] = useState<CommunityKind>("public");

  const option = (value: CommunityKind, label: string) => (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
      <input
        type="radio"
        name="kind"
        value={value}
        checked={kind === value}
        onChange={() => setKind(value)}
        className="accent-primary mt-1 size-5 shrink-0"
      />
      <span>
        <span className="block">{label}</span>
        <span className="text-muted-foreground block text-sm">{COMMUNITY_KIND_HINT[value]}</span>
      </span>
    </label>
  );

  return (
    <form action={action} className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" maxLength={60} placeholder="Lauftreff Isar" required />
      </div>

      <fieldset className="space-y-1">
        <legend className="mb-1 text-sm font-medium">Wer darf rein?</legend>
        {option("public", "Jeder (öffentlich)")}
        {option("private", "Nur mit Link (privat)")}
        <details className="pt-1" open={kind === "coaching"}>
          <summary className="text-muted-foreground min-h-11 cursor-pointer py-2 text-sm underline underline-offset-4">
            Ich betreue Athleten
          </summary>
          {option("coaching", "Coaching")}
        </details>
      </fieldset>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sport">Sportart (optional)</Label>
          <Input id="sport" name="sport" maxLength={40} list="sport-suggestions" placeholder="Laufen" />
          <datalist id="sport-suggestions">
            {SPORT_SUGGESTIONS.map((sport) => (
              <option key={sport} value={sport} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Stadt (optional)</Label>
          <Input id="city" name="city" maxLength={60} placeholder="München" />
        </div>
      </div>
      <p className="text-muted-foreground -mt-3 text-sm">
        Gib eine Stadt oder ein Viertel an, keine Privatadresse.
      </p>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung (optional)</Label>
        <Input id="description" name="description" maxLength={200} placeholder="Samstags locker an der Isar" />
      </div>

      <Feedback state={state} />
      <Button type="submit" className="w-full md:w-auto" disabled={pending}>
        {pending ? "Wird erstellt" : "Community erstellen"}
      </Button>
    </form>
  );
}

/** Beitritt mit einem eingetippten Einladungscode. */
export function JoinWithCodeForm() {
  const [state, action, pending] = useActionState(joinWithCode, initial);

  return (
    <form action={action} className="max-w-sm space-y-2">
      <Label htmlFor="code">Einladungscode</Label>
      <div className="flex gap-3">
        <Input id="code" name="code" autoComplete="off" autoCapitalize="none" required />
        <Button type="submit" variant="outline" disabled={pending}>
          Beitreten
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Beitritt zu einer öffentlichen Community aus der Suche. */
export function JoinPublicButton({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(joinPublicCommunity, initial);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" size="sm" disabled={pending} aria-label={`${name} beitreten`}>
        Beitreten
      </Button>
      <Feedback state={state} />
    </form>
  );
}

/**
 * Beitritt aus einem Teilen-Link. Mit autoJoin hat die Person schon vor der Registrierung
 * „Beitreten" gewählt: Dann läuft der Beitritt nach der Anmeldung ohne weiteren Tipp.
 */
export function AcceptCommunityInvite({
  code,
  autoJoin,
  campaign = null,
}: {
  code: string;
  autoJoin: boolean;
  campaign?: string | null;
}) {
  const [state, action, pending] = useActionState(acceptInvite, initial);
  const form = useRef<HTMLFormElement>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (autoJoin && !sent.current) {
      sent.current = true;
      form.current?.requestSubmit();
    }
  }, [autoJoin]);

  return (
    <form ref={form} action={action} className="space-y-3">
      <input type="hidden" name="code" value={code} />
      {campaign && <input type="hidden" name="quelle" value={campaign} />}
      <Feedback state={state} />
      <Button type="submit" className="w-full md:w-auto" disabled={pending}>
        {pending ? "Wird beigetreten" : "Beitreten"}
      </Button>
    </form>
  );
}

// Verlassen in zwei Schritten: erst nachfragen, dann verlassen.
export function LeaveCommunity({ id, managesAlone }: { id: string; managesAlone: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(leaveCommunity, initial);

  if (!confirming) {
    return (
      <Button variant="ghost" className="-ml-4" onClick={() => setConfirming(true)}>
        Community verlassen
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <p>
        {managesAlone
          ? "Du verwaltest diese Community. Wenn du gehst, übernimmt das Mitglied, das am längsten dabei ist. Bist du allein, wird die Community gelöscht."
          : "Du verlässt die Community. Du kannst später wieder beitreten."}
      </p>
      <Feedback state={state} />
      <div className="flex gap-3">
        <Button type="submit" variant="destructive" disabled={pending}>
          Verlassen
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

/** Community melden, zum Beispiel wegen eines unpassenden Namens. */
export function ReportCommunity({ id }: { id: string }) {
  const [state, action, pending] = useActionState(reportCommunity, initial);

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
        Community melden
      </summary>
      <form action={action} className="mt-2 max-w-xl space-y-2">
        <input type="hidden" name="id" value={id} />
        <Label htmlFor="reason">Was passt nicht?</Label>
        <Input id="reason" name="reason" maxLength={500} required />
        <Feedback state={state} />
        <Button type="submit" variant="outline" disabled={pending}>
          Meldung senden
        </Button>
      </form>
    </details>
  );
}
