"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/result";

import {
  blockPerson,
  openDirectChat,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
  unblockPerson,
} from "../actions";
import type { FriendState } from "../queries";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

function Feedback({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-sm">
        {state.message}
      </p>
    );
  }
  return null;
}

/** Ein Button, der eine Aktion für diese Person ausführt. */
function PersonAction({
  action,
  personId,
  fields,
  variant = "default",
  children,
}: {
  action: Action;
  personId: string;
  fields?: Record<string, string>;
  variant?: "default" | "outline" | "ghost" | "destructive" | "link";
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="personId" value={personId} />
      {Object.entries(fields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant={variant} disabled={pending} className="w-full md:w-auto">
        {children}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

/** Erst nachfragen, dann ausführen (Freundschaft beenden, blockieren). */
function Confirmed({
  label,
  question,
  confirmLabel,
  action,
  personId,
}: {
  label: string;
  question: string;
  confirmLabel: string;
  action: Action;
  personId: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="text-muted-foreground inline-flex min-h-11 items-center text-sm underline underline-offset-4"
      >
        {label}
      </button>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm">{question}</p>
      <div className="flex flex-col gap-3 md:flex-row">
        <PersonAction action={action} personId={personId} variant="destructive">
          {confirmLabel}
        </PersonAction>
        <Button type="button" variant="outline" onClick={() => setAsking(false)} className="w-full md:w-auto">
          Abbrechen
        </Button>
      </div>
    </div>
  );
}

/**
 * Freundschaft mit einer Person: anfragen, annehmen, privat schreiben, beenden, blockieren.
 * Was erlaubt ist, entscheidet die Datenbank (Migration friends_and_direct_chats).
 */
export function FriendActions({ personId, name, state }: { personId: string; name: string; state: FriendState }) {
  if (state === "blocked") {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          Du hast {name} blockiert. Ihr könnt euch nicht anfragen und nicht privat schreiben.
        </p>
        <PersonAction action={unblockPerson} personId={personId} variant="outline">
          Blockierung aufheben
        </PersonAction>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {state === "none" && (
        <PersonAction action={sendFriendRequest} personId={personId}>
          Als Freund hinzufügen
        </PersonAction>
      )}
      {state === "outgoing" && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Anfrage gesendet. {name} kann sie annehmen oder ablehnen.</p>
          <PersonAction action={removeFriend} personId={personId} variant="outline">
            Anfrage zurückziehen
          </PersonAction>
        </div>
      )}
      {state === "incoming" && (
        <div className="space-y-3">
          <p>{name} möchte mit dir befreundet sein.</p>
          <div className="flex flex-col gap-3 md:flex-row">
            <PersonAction action={respondFriendRequest} personId={personId} fields={{ accept: "yes" }}>
              Annehmen
            </PersonAction>
            <PersonAction action={respondFriendRequest} personId={personId} fields={{ accept: "no" }} variant="outline">
              Ablehnen
            </PersonAction>
          </div>
        </div>
      )}
      {state === "friends" && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Ihr seid befreundet.</p>
          <PersonAction action={openDirectChat} personId={personId}>
            Nachricht schreiben
          </PersonAction>
        </div>
      )}

      <div className="flex flex-col items-start gap-1">
        {state === "friends" && (
          <Confirmed
            label="Freundschaft beenden"
            question={`Freundschaft mit ${name} beenden? Euer Privatchat ist danach geschlossen.`}
            confirmLabel="Freundschaft beenden"
            action={removeFriend}
            personId={personId}
          />
        )}
        <Confirmed
          label="Blockieren"
          question={`${name} blockieren? Eine Freundschaft endet, und ihr könnt euch nicht mehr anfragen oder privat schreiben. ${name} erfährt davon nichts.`}
          confirmLabel="Blockieren"
          action={blockPerson}
          personId={personId}
        />
      </div>
    </div>
  );
}
