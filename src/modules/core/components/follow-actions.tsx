"use client";

import { Check } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/result";

import {
  blockPerson,
  followPerson,
  openDirectChat,
  removeFollower,
  respondFollowRequest,
  unblockPerson,
  unfollowPerson,
} from "../actions";
import type { FollowState } from "../queries";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

function Feedback({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {state.error}
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
  variant?: "default" | "outline" | "destructive";
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex-1 space-y-2 md:flex-none">
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

/** Erst nachfragen, dann ausführen. */
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
    <div className="w-full space-y-3">
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
 * Folgen und Schreiben auf dem Profil einer Person, wie bei Instagram. Was erlaubt ist, entscheidet
 * die Datenbank (Migration follows): Einem privaten Konto schreibt man erst, wenn man ihm folgt.
 */
export function FollowActions({
  personId,
  name,
  isPrivate,
  state,
}: {
  personId: string;
  name: string;
  isPrivate: boolean;
  state: FollowState;
}) {
  if (state.blocked) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          Du hast {name} blockiert. Ihr könnt einander nicht folgen und nicht privat schreiben.
        </p>
        <PersonAction action={unblockPerson} personId={personId} variant="outline">
          Blockierung aufheben
        </PersonAction>
      </div>
    );
  }

  const canMessage = state.following === "accepted" || !isPrivate;
  const mutual = state.following === "accepted" && state.followsMe;

  return (
    <div className="space-y-6">
      {state.requestedMe && (
        <div className="space-y-3 border-y py-4">
          <p>{name} möchte dir folgen.</p>
          <div className="flex flex-col gap-3 md:flex-row">
            <PersonAction action={respondFollowRequest} personId={personId} fields={{ accept: "yes" }}>
              Bestätigen
            </PersonAction>
            <PersonAction action={respondFollowRequest} personId={personId} fields={{ accept: "no" }} variant="outline">
              Löschen
            </PersonAction>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        {state.following === "none" && (
          <PersonAction action={followPerson} personId={personId} variant={state.requestedMe ? "outline" : "default"}>
            {state.followsMe ? "Zurückfolgen" : "Folgen"}
          </PersonAction>
        )}
        {state.following === "pending" && (
          <PersonAction action={unfollowPerson} personId={personId} variant="outline">
            Angefragt · zurückziehen
          </PersonAction>
        )}
        {state.following === "accepted" && (
          <span className="border-input inline-flex h-12 items-center justify-center gap-2 rounded-lg border px-4 font-medium md:h-10">
            <Check size={20} strokeWidth={1.5} aria-hidden />
            Gefolgt
          </span>
        )}
        {canMessage && (
          <PersonAction
            action={openDirectChat}
            personId={personId}
            variant={state.following === "accepted" && !state.requestedMe ? "default" : "outline"}
          >
            Nachricht
          </PersonAction>
        )}
      </div>
      {canMessage && !mutual && (
        <p className="text-muted-foreground -mt-3 text-sm">
          Solange ihr euch nicht gegenseitig folgt, kommt deine erste Nachricht als Anfrage an.
        </p>
      )}
      {state.following === "pending" && (
        <p className="text-muted-foreground -mt-3 text-sm">{name} entscheidet, ob du folgen darfst.</p>
      )}

      <div className="flex flex-col items-start gap-1">
        {state.followsMe && <p className="text-muted-foreground text-sm">{name} folgt dir.</p>}
        {state.following === "accepted" && (
          <Confirmed
            label="Nicht mehr folgen"
            question={
              isPrivate
                ? `Nicht mehr folgen? Um ${name} wieder zu folgen, musst du erneut anfragen.`
                : `${name} nicht mehr folgen?`
            }
            confirmLabel="Nicht mehr folgen"
            action={unfollowPerson}
            personId={personId}
          />
        )}
        {state.followsMe && (
          <Confirmed
            label="Als Follower entfernen"
            question={`${name} als Follower entfernen? ${name} erfährt davon nichts.`}
            confirmLabel="Entfernen"
            action={removeFollower}
            personId={personId}
          />
        )}
        <Confirmed
          label="Blockieren"
          question={`${name} blockieren? Ihr folgt einander nicht mehr und könnt euch nicht privat schreiben. ${name} erfährt davon nichts.`}
          confirmLabel="Blockieren"
          action={blockPerson}
          personId={personId}
        />
      </div>
    </div>
  );
}

/** Bestätigen und Löschen einer Folgen-Anfrage in der Liste der Anfragen. */
export function FollowRequestButtons({ personId }: { personId: string }) {
  return (
    <div className="flex gap-2">
      <PersonAction action={respondFollowRequest} personId={personId} fields={{ accept: "yes" }}>
        Bestätigen
      </PersonAction>
      <PersonAction action={respondFollowRequest} personId={personId} fields={{ accept: "no" }} variant="outline">
        Löschen
      </PersonAction>
    </div>
  );
}
