"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/result";

import { createMeetup, deleteMeetup, joinMeetup, leaveMeetup } from "../actions";

const initial: FormState = {};

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {error}
    </p>
  );
}

/**
 * Neues Treffen. Tag und Uhrzeit kommen vom Server vorbelegt (deutsche Zeit),
 * damit Server und Browser dasselbe anzeigen.
 */
export function CreateMeetupForm({
  groupId,
  defaultDate,
  defaultTime,
  minDate,
}: {
  groupId: string;
  defaultDate: string;
  defaultTime: string;
  minDate: string;
}) {
  const [state, action, pending] = useActionState(createMeetup, initial);

  return (
    <form action={action} className="max-w-xl space-y-6">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="space-y-2">
        <Label htmlFor="title">Was habt ihr vor?</Label>
        <Input id="title" name="title" maxLength={80} placeholder="Lockerer Lauf an der Isar" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Tag</Label>
          <Input id="date" name="date" type="date" min={minDate} defaultValue={defaultDate} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Uhrzeit</Label>
          <Input id="time" name="time" type="time" step={300} defaultValue={defaultTime} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="place">Treffpunkt</Label>
        <Input id="place" name="place" maxLength={80} placeholder="Reichenbachbrücke" required aria-describedby="place-hint" />
        <p id="place-hint" className="text-muted-foreground text-sm">
          Ein öffentlicher Ort, zum Beispiel eine Brücke oder ein Parkeingang. Keine Privatadresse.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max">Höchstens (optional)</Label>
        <Input
          id="max"
          name="max"
          type="number"
          inputMode="numeric"
          min={2}
          max={500}
          placeholder="Ohne Grenze"
          className="max-w-40"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Notiz (optional)</Label>
        <Input id="note" name="note" maxLength={300} placeholder="Etwa 8 km, ruhiges Tempo" />
      </div>

      <ErrorText error={state.error} />
      <Button type="submit" className="w-full md:w-auto" disabled={pending}>
        {pending ? "Wird geplant" : "Treffen planen"}
      </Button>
    </form>
  );
}

type ToggleProps = {
  meetupId: string;
  groupId: string;
  joined: boolean;
  title: string;
  primary?: boolean;
};

/** Zusagen oder absagen. "primary" ist der eine gefüllte Button einer Ansicht. */
export function MeetupToggle(props: ToggleProps) {
  // Neuer Zustand nach dem Umschalten: frisches Formular mit der passenden Aktion.
  return <MeetupToggleForm key={String(props.joined)} {...props} />;
}

function MeetupToggleForm({
  meetupId,
  groupId,
  joined,
  title,
  primary = false,
}: ToggleProps) {
  const [state, action, pending] = useActionState(joined ? leaveMeetup : joinMeetup, initial);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="meetupId" value={meetupId} />
      <input type="hidden" name="groupId" value={groupId} />
      <Button
        type="submit"
        variant={joined ? "outline" : primary ? "default" : "outline"}
        size={primary ? "default" : "sm"}
        className={primary ? "w-full md:w-auto" : undefined}
        disabled={pending}
        aria-label={primary ? undefined : `${joined ? "Absagen" : "Ich bin dabei"}: ${title}`}
      >
        {joined ? "Absagen" : "Ich bin dabei"}
      </Button>
      <ErrorText error={state.error} />
    </form>
  );
}

// Entfernen in zwei Schritten: erst nachfragen, dann entfernen.
export function DeleteMeetup({ meetupId, groupId }: { meetupId: string; groupId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(deleteMeetup, initial);

  if (!confirming) {
    return (
      <Button variant="ghost" className="-ml-4" onClick={() => setConfirming(true)}>
        Treffen entfernen
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="meetupId" value={meetupId} />
      <input type="hidden" name="groupId" value={groupId} />
      <p>Das Treffen verschwindet für alle, auch für die, die schon zugesagt haben.</p>
      <ErrorText error={state.error} />
      <div className="flex gap-3">
        <Button type="submit" variant="destructive" disabled={pending}>
          Entfernen
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
