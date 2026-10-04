"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/result";

import {
  createMeetup,
  deleteMeetup,
  joinMeetup,
  leaveMeetup,
  removeMeetupShare,
  updateMeetupShares,
} from "../actions";

const initial: FormState = {};

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {error}
    </p>
  );
}

type CommunityOption = { id: string; name: string; kindLabel: string };

/** Häkchen je eigener Community. Ohne Häkchen bleibt ein Training privat. */
function ShareChoices({ communities, selected }: { communities: readonly CommunityOption[]; selected: readonly string[] }) {
  if (communities.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Du bist noch in keiner Community. Das Training bleibt privat.
      </p>
    );
  }
  return (
    <ul>
      {communities.map((c) => (
        <li key={c.id}>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
            <input
              type="checkbox"
              name="shareWith"
              value={c.id}
              defaultChecked={selected.includes(c.id)}
              className="accent-primary size-5 shrink-0"
            />
            <span className="min-w-0">
              <span className="block">{c.name}</span>
              <span className="text-muted-foreground block text-sm">{c.kindLabel}</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/**
 * Training planen. Tag und Uhrzeit kommen vom Server vorbelegt (deutsche Zeit),
 * damit Server und Browser dasselbe anzeigen.
 */
export function CreateMeetupForm({
  templates,
  communities,
  preselected,
  defaultDate,
  defaultTime,
  minDate,
}: {
  templates: readonly { id: string; name: string }[];
  communities: readonly CommunityOption[];
  preselected: readonly string[];
  defaultDate: string;
  defaultTime: string;
  minDate: string;
}) {
  const [state, action, pending] = useActionState(createMeetup, initial);

  return (
    <form action={action} className="max-w-xl space-y-6">
      {templates.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="templateId">Vorlage (optional)</Label>
          <select
            id="templateId"
            name="templateId"
            defaultValue=""
            className="border-input bg-background focus-visible:outline-ring h-12 w-full rounded-lg border px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 md:h-10"
          >
            <option value="">Ohne Vorlage</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-sm">Mit Vorlage startest du das Training am Tag direkt aus dem Plan.</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">{templates.length > 0 ? "Titel (optional mit Vorlage)" : "Was hast du vor?"}</Label>
        <Input id="title" name="title" maxLength={80} placeholder="Lockerer Lauf an der Isar" />
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

      <fieldset className="space-y-1">
        <legend className="mb-1 text-sm font-medium">Teilen mit</legend>
        <p className="text-muted-foreground pb-1 text-sm">
          Mitglieder der gewählten Communities sehen das Training auf der Pinnwand und können zusagen.
        </p>
        <ShareChoices communities={communities} selected={preselected} />
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="place">Treffpunkt (optional)</Label>
        <Input id="place" name="place" maxLength={80} placeholder="Reichenbachbrücke" aria-describedby="place-hint" />
        <p id="place-hint" className="text-muted-foreground text-sm">
          Ein öffentlicher Ort, zum Beispiel eine Brücke, ein Parkeingang oder ein Studio. Keine Privatadresse.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="max">Höchstens (optional)</Label>
          <Input id="max" name="max" type="number" inputMode="numeric" min={2} max={500} placeholder="Ohne Grenze" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Notiz (optional)</Label>
        <Input id="note" name="note" maxLength={300} placeholder="Etwa 8 km, ruhiges Tempo" />
      </div>

      <ErrorText error={state.error} />
      <Button type="submit" className="w-full md:w-auto" disabled={pending}>
        {pending ? "Wird geplant" : "Training planen"}
      </Button>
    </form>
  );
}

/** Mit welchen Communities ein eigenes Training geteilt ist, nachträglich ändern. */
export function ShareSettings({
  meetupId,
  communities,
  selected,
}: {
  meetupId: string;
  communities: readonly CommunityOption[];
  selected: readonly string[];
}) {
  const [state, action, pending] = useActionState(updateMeetupShares, initial);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="meetupId" value={meetupId} />
      <ShareChoices communities={communities} selected={selected} />
      <ErrorText error={state.error} />
      {state.message && (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      )}
      {communities.length > 0 && (
        <Button type="submit" variant="outline" disabled={pending}>
          Teilen speichern
        </Button>
      )}
    </form>
  );
}

type ToggleProps = { meetupId: string; joined: boolean; title: string; primary?: boolean };

/** Zusagen oder absagen. "primary" ist der eine gefüllte Button einer Ansicht. */
export function MeetupToggle(props: ToggleProps) {
  // Neuer Zustand nach dem Umschalten: frisches Formular mit der passenden Aktion.
  return <MeetupToggleForm key={String(props.joined)} {...props} />;
}

function MeetupToggleForm({ meetupId, joined, title, primary = false }: ToggleProps) {
  const [state, action, pending] = useActionState(joined ? leaveMeetup : joinMeetup, initial);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="meetupId" value={meetupId} />
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

/** Verwaltung einer Community nimmt ein fremdes Training von ihrer Pinnwand. */
export function RemoveFromCommunity({ meetupId, groupId, name }: { meetupId: string; groupId: string; name: string }) {
  const [state, action, pending] = useActionState(removeMeetupShare, initial);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="meetupId" value={meetupId} />
      <input type="hidden" name="groupId" value={groupId} />
      <Button type="submit" variant="ghost" className="-ml-4" disabled={pending}>
        Aus {name} entfernen
      </Button>
      <ErrorText error={state.error} />
    </form>
  );
}

// Entfernen in zwei Schritten: erst nachfragen, dann entfernen.
export function DeleteMeetup({ meetupId, shared }: { meetupId: string; shared: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(deleteMeetup, initial);

  if (!confirming) {
    return (
      <Button variant="ghost" className="-ml-4" onClick={() => setConfirming(true)}>
        Training entfernen
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="meetupId" value={meetupId} />
      <p>
        {shared
          ? "Das Training verschwindet für alle, auch für die, die schon zugesagt haben, samt Chat."
          : "Das Training verschwindet aus deinem Plan."}
      </p>
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
