"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/result";

import {
  cancelMeetupSeries,
  confirmAttendance,
  createMeetup,
  deleteMeetup,
  joinMeetup,
  joinPublicMeetup,
  leaveMeetup,
  removeMeetupShare,
  updateMeetup,
  updateMeetupShares,
} from "../actions";
import {
  JOIN_INTENT_COOKIE,
  MEETUP_LEVEL_LABEL,
  MEETUP_LEVELS,
  type MeetupFormValues,
  type MeetupLevel,
} from "../logic";
import type { Sport } from "../queries";

import { SportPicker } from "./sport-picker";

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

const selectClass =
  "border-input bg-background focus-visible:outline-ring h-12 w-full rounded-lg border px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 md:h-10";

/** Niveau als Auswahl-Chips; ein zweiter Tipp auf denselben Chip hebt die Auswahl auf. */
function LevelChoice({ initial }: { initial: MeetupLevel | null }) {
  const [level, setLevel] = useState<MeetupLevel | null>(initial);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Niveau (optional)</legend>
      <input type="hidden" name="level" value={level ?? ""} />
      <div className="flex flex-wrap gap-2">
        {MEETUP_LEVELS.map((l) => (
          <ChoiceChip key={l} selected={level === l} onClick={() => setLevel(level === l ? null : l)}>
            {MEETUP_LEVEL_LABEL[l]}
          </ChoiceChip>
        ))}
      </div>
    </fieldset>
  );
}

/** Felder, die nur bestimmte Sportarten haben: Distanz, Höhenmeter, Tempo. */
function SportFields({ sport, values }: { sport: Sport; values?: MeetupFormValues }) {
  if (!sport.hasDistance && !sport.hasElevation && !sport.paceUnit) return null;
  return (
    <div className="grid max-w-sm grid-cols-2 gap-3">
      {sport.hasDistance && (
        <div className="space-y-2">
          <Label htmlFor="distance">Distanz in km</Label>
          <Input
            id="distance"
            name="distance"
            inputMode="decimal"
            placeholder="z. B. 10"
            defaultValue={values?.distance}
            className="num text-right"
          />
        </div>
      )}
      {sport.paceUnit === "min_km" && (
        <div className="space-y-2">
          <Label htmlFor="pace">Tempo in min/km</Label>
          <Input
            id="pace"
            name="pace"
            inputMode="text"
            placeholder="z. B. 6:00"
            defaultValue={values?.pace}
            className="num text-right"
          />
        </div>
      )}
      {sport.paceUnit === "kmh" && (
        <div className="space-y-2">
          <Label htmlFor="speed">Tempo in km/h</Label>
          <Input
            id="speed"
            name="speed"
            inputMode="decimal"
            placeholder="z. B. 25"
            defaultValue={values?.speed}
            className="num text-right"
          />
        </div>
      )}
      {sport.hasElevation && (
        <div className="space-y-2">
          <Label htmlFor="elevation">Höhenmeter</Label>
          <Input
            id="elevation"
            name="elevation"
            inputMode="numeric"
            defaultValue={values?.elevation}
            className="num text-right"
          />
        </div>
      )}
      <p className="text-muted-foreground col-span-2 text-sm">Alles optional. Hilft anderen einzuschätzen, ob es passt.</p>
    </div>
  );
}

/**
 * Training planen oder bearbeiten. Zuerst die Sportart, danach nur die Felder, die zu ihr passen:
 * bei Kraft die Vorlage, bei Ausdauer Distanz, Höhenmeter und Tempo. Tag und Uhrzeit kommen vom
 * Server vorbelegt (deutsche Zeit), damit Server und Browser dasselbe anzeigen. Beim Planen gibt es
 * „Jede Woche wiederholen“ und das Teilen; beim Bearbeiten einer Reihe die Wahl, ob nur dieser
 * Termin oder auch alle folgenden geändert werden. Geteilt wird beim Bearbeiten auf der Seite des
 * Trainings.
 */
export function MeetupForm({
  sports,
  recentSportIds,
  defaultSportId,
  templates,
  communities = [],
  preselected = [],
  defaultDate,
  defaultTime,
  minDate,
  existing,
}: {
  sports: readonly Sport[];
  recentSportIds: readonly string[];
  defaultSportId: string | null;
  templates: readonly { id: string; name: string }[];
  /** Nur beim Planen: geteilt wird beim Bearbeiten auf der Seite des Trainings */
  communities?: readonly CommunityOption[];
  preselected?: readonly string[];
  defaultDate: string;
  defaultTime: string;
  minDate: string;
  existing?: MeetupFormValues;
}) {
  const [state, action, pending] = useActionState(existing ? updateMeetup : createMeetup, initial);
  const [, startTransition] = useTransition();
  // Beim Planen vergibt das Gerät die ID: Ein erneutes Senden legt nichts doppelt an.
  const [id] = useState(() => existing?.id ?? crypto.randomUUID());
  const [sportId, setSportId] = useState<string | null>(
    existing?.sportId ?? defaultSportId ?? recentSportIds[0] ?? null,
  );
  const sport = sports.find((s) => s.id === sportId) ?? null;

  return (
    <form
      // Über onSubmit statt action: React leert sonst nach einem Fehler alle Felder.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="max-w-xl space-y-8"
    >
      <input type="hidden" name={existing ? "meetupId" : "id"} value={id} />
      <input type="hidden" name="sportId" value={sportId ?? ""} />
      <SportPicker sports={sports} recentSportIds={recentSportIds} value={sportId} onChange={setSportId}>
        {sport?.hasSets &&
          (templates.length > 0 ? (
            <div className="space-y-2 pt-2">
              <Label htmlFor="templateId">Vorlage (optional)</Label>
              <select
                id="templateId"
                name="templateId"
                defaultValue={existing?.templateId ?? ""}
                className={selectClass}
              >
                <option value="">Ohne Vorlage</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-sm">
                Mit Vorlage startest du das Training am Tag direkt aus dem Plan.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground pt-2 text-sm">
              Mit einer Vorlage startest du das Training am Tag direkt.{" "}
              <Link href="/vorlagen/neu" className="text-foreground underline underline-offset-4">
                Vorlage erstellen
              </Link>
            </p>
          ))}
      </SportPicker>

      <div className="space-y-6">
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

        {existing?.seriesId ? (
          <fieldset className="space-y-1">
            <legend className="mb-1 text-sm font-medium">Ändern für</legend>
            {(
              [
                ["single", "Nur diesen Termin"],
                ["series", "Diesen und alle folgenden Termine"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="scope"
                  value={value}
                  defaultChecked={value === "single"}
                  className="accent-primary size-5 shrink-0"
                />
                {label}
              </label>
            ))}
            <p className="text-muted-foreground text-sm">Jeder folgende Termin behält seinen Tag. Uhrzeit und Angaben ändern sich.</p>
          </fieldset>
        ) : (
          !existing && (
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input type="checkbox" name="weekly" className="accent-primary mt-0.5 size-5 shrink-0" />
              <span>
                <span className="block">Jede Woche wiederholen</span>
                <span className="text-muted-foreground block text-sm">
                  Legt die nächsten acht Termine an. Die Reihe geht danach von selbst weiter, bis du sie absagst.
                </span>
              </span>
            </label>
          )
        )}

        <fieldset className="grid max-w-sm grid-cols-2 gap-3">
          <legend className="mb-2 text-sm font-medium">Dauer</legend>
          <div className="space-y-2">
            <Label htmlFor="hours">Stunden</Label>
            <Input
              id="hours"
              name="hours"
              inputMode="numeric"
              defaultValue={existing?.hours ?? "1"}
              className="num text-right"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minutes">Minuten</Label>
            <Input
              id="minutes"
              name="minutes"
              inputMode="numeric"
              defaultValue={existing?.minutes ?? "0"}
              className="num text-right"
            />
          </div>
        </fieldset>

        {/* key: Beim Wechsel der Sportart verschwinden Eingaben, die nicht mehr passen. */}
        {sport && (
          <SportFields key={sport.id} sport={sport} values={existing?.sportId === sport.id ? existing : undefined} />
        )}

        <LevelChoice initial={existing?.level ?? null} />

        <div className="space-y-2">
          <Label htmlFor="title">Titel (optional)</Label>
          <Input
            id="title"
            name="title"
            maxLength={80}
            defaultValue={existing?.title}
            placeholder={sport ? `Ohne Titel: ${sport.name}` : "Lockerer Lauf an der Isar"}
          />
        </div>
      </div>

      {!existing && (
        <fieldset className="space-y-1">
          <legend className="mb-1 text-sm font-medium">Teilen mit</legend>
          <p className="text-muted-foreground pb-1 text-sm">
            Mitglieder der gewählten Communities sehen das Training auf der Pinnwand und können zusagen.
            In öffentlichen Communities gibt es dazu einen Link, über den alle es sehen, ohne Namen.
          </p>
          <ShareChoices communities={communities} selected={preselected} />
        </fieldset>
      )}

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="place">Treffpunkt (optional)</Label>
          <Input
            id="place"
            name="place"
            maxLength={80}
            defaultValue={existing?.place}
            placeholder="Reichenbachbrücke"
            aria-describedby="place-hint"
          />
          <p id="place-hint" className="text-muted-foreground text-sm">
            Ein öffentlicher Ort, zum Beispiel eine Brücke, ein Parkeingang, eine Halle oder ein Studio. Keine Privatadresse.
          </p>
        </div>

        <div className="space-y-2 sm:w-1/2 sm:pr-2">
          <Label htmlFor="max">Höchstens (optional)</Label>
          <Input
            id="max"
            name="max"
            type="number"
            inputMode="numeric"
            min={2}
            max={500}
            defaultValue={existing?.max}
            placeholder="Ohne Grenze"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Notiz (optional)</Label>
          <Input id="note" name="note" maxLength={300} defaultValue={existing?.note} placeholder="Wir laufen in zwei Gruppen" />
        </div>
      </div>

      <ErrorText error={state.error} />
      <Button type="submit" className="w-full md:w-auto" disabled={pending}>
        {pending ? "Wird gespeichert" : existing ? "Änderungen speichern" : "Training planen"}
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
export function DeleteMeetup({ meetupId, shared, inSeries }: { meetupId: string; shared: boolean; inSeries: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [scope, setScope] = useState<"single" | "series">("single");
  const [singleState, single, singlePending] = useActionState(deleteMeetup, initial);
  const [seriesState, series, seriesPending] = useActionState(cancelMeetupSeries, initial);
  const pending = singlePending || seriesPending;
  const error = scope === "series" ? seriesState.error : singleState.error;

  if (!confirming) {
    return (
      <Button variant="ghost" className="-ml-4" onClick={() => setConfirming(true)}>
        {inSeries ? "Absagen" : "Training entfernen"}
      </Button>
    );
  }

  return (
    <form action={scope === "series" ? series : single} className="space-y-3">
      <input type="hidden" name="meetupId" value={meetupId} />
      {inSeries && (
        <fieldset className="space-y-1">
          <legend className="mb-1 text-sm font-medium">Was absagen?</legend>
          {(
            [
              ["single", "Nur diesen Termin"],
              ["series", "Diesen und alle folgenden, die Reihe endet"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="cancelScope"
                checked={scope === value}
                onChange={() => setScope(value)}
                className="accent-primary size-5 shrink-0"
              />
              {label}
            </label>
          ))}
        </fieldset>
      )}
      <p>
        {scope === "series"
          ? "Dieser und alle folgenden Termine verschwinden für alle, samt Chat. Wer zugesagt hat, erfährt es."
          : shared
            ? "Das Training verschwindet für alle, auch für die, die schon zugesagt haben, samt Chat."
            : "Das Training verschwindet aus deinem Plan."}
      </p>
      <ErrorText error={error} />
      <div className="flex gap-3">
        <Button type="submit" variant="destructive" disabled={pending}>
          {inSeries ? "Absagen" : "Entfernen"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

/**
 * Zusagen über den öffentlichen Link. autoJoin: Wer vor der Anmeldung „zusagen“ gewählt hat, sagt
 * nach der Rückkehr ohne weiteren Tipp zu.
 */
export function PublicMeetupJoin({
  meetupId,
  campaign,
  autoJoin,
}: {
  meetupId: string;
  campaign: string | null;
  autoJoin: boolean;
}) {
  const [state, action, pending] = useActionState(joinPublicMeetup, initial);
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
      <input type="hidden" name="meetupId" value={meetupId} />
      {campaign && <input type="hidden" name="quelle" value={campaign} />}
      <ErrorText error={state.error} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Wird zugesagt" : "Ich bin dabei"}
      </Button>
    </form>
  );
}

/**
 * Registrieren oder Anmelden, um über den öffentlichen Link zuzusagen. Der Tipp merkt sich für eine
 * halbe Stunde, dass diese Person zusagen will, damit die Zusage nach der Rückkehr von selbst läuft.
 */
export function PublicMeetupAuthLinks({ meetupId, next }: { meetupId: string; next: string }) {
  const remember = () => {
    document.cookie = `${JOIN_INTENT_COOKIE}=${meetupId}; Max-Age=1800; Path=/; SameSite=Lax`;
  };
  const encoded = encodeURIComponent(next);
  return (
    <div className="space-y-4">
      <Button asChild className="w-full">
        <Link href={`/registrieren?next=${encoded}`} onClick={remember}>
          Konto erstellen und zusagen
        </Link>
      </Button>
      <p className="text-sm">
        <Link
          href={`/login?next=${encoded}`}
          onClick={remember}
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Ich habe schon ein Konto
        </Link>
      </p>
    </div>
  );
}

/**
 * „Warst du dabei?“ mit „Ja, war dabei“ und „Nein“. Beide als Umriss, weil auf „Heute“ der eine
 * gefüllte Button „Aktivität eintragen“ ist. Nach der Antwort zeigt die Seite den neuen Stand.
 */
export function AttendanceQuestion({ meetupId, title }: { meetupId: string; title: string }) {
  const [state, action, pending] = useActionState(confirmAttendance, initial);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="meetupId" value={meetupId} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="antwort"
          value="ja"
          variant="outline"
          size="sm"
          disabled={pending}
          aria-label={`Ja, ich war bei ${title} dabei`}
        >
          Ja, war dabei
        </Button>
        <Button
          type="submit"
          name="antwort"
          value="nein"
          variant="ghost"
          size="sm"
          disabled={pending}
          aria-label={`Nein, ich war bei ${title} nicht dabei`}
        >
          Nein
        </Button>
      </div>
      <ErrorText error={state.error} />
      {state.message && (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      )}
    </form>
  );
}
