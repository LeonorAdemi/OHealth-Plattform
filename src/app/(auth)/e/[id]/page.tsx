import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";
import { PublicMeetupAuthLinks, PublicMeetupJoin } from "@/modules/core/components/meetup-forms";
import { MeetupDate } from "@/modules/core/components/meetup-list";
import {
  campaignTag,
  describeMeetupCount,
  describeMeetupDetails,
  describeWeekly,
  isMeetupFull,
  JOIN_INTENT_COOKIE,
  meetupDetailRows,
  meetupTimeRange,
  publicEventPath,
} from "@/modules/core/logic";
import { getPublicMeetup } from "@/modules/core/queries";

// Öffentlicher Link eines Events. Ohne Anmeldung sichtbar, damit Messenger eine Vorschau zeigen
// und Eingeladene vor der Registrierung sehen, worauf sie zusagen. Namen von Personen erscheinen
// hier nie; die Datenbank liefert nur Events aus öffentlichen Communities.

const preview = cache(getPublicMeetup);

const longDate = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const shortDate = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  day: "numeric",
  month: "numeric",
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const meetup = z.uuid().safeParse(id).success ? await preview(id) : null;
  if (!meetup) return { title: "Training", robots: { index: false } };

  const when = `${shortDate.format(new Date(meetup.startsAt))}, ${meetupTimeRange(meetup.startsAt, meetup.durationMinutes)} Uhr`;
  const description = [
    describeMeetupDetails(meetup),
    meetup.place,
    describeMeetupCount(meetup.count, meetup.maxParticipants),
    meetup.communityName,
  ]
    .filter(Boolean)
    .join(" · ");
  const title = `${meetup.title} · ${when}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "OHealth",
      images: [{ url: `${await requestOrigin()}/logo.png` }],
    },
    robots: { index: false },
  };
}

export default async function PublicEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ zusagen?: string; quelle?: string }>;
}) {
  const [{ id }, { zusagen, quelle }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const meetup = await preview(id);

  if (!meetup) {
    return (
      <>
        <h1 className="text-titel font-semibold">Training nicht gefunden</h1>
        <p className="mt-4">
          Dieses Training ist vorbei, abgesagt oder nicht öffentlich. Frag die Person, die den Link geteilt hat.
        </p>
      </>
    );
  }

  if (meetup.isJoined) redirect(`/plan/${id}`);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  // Von selbst zusagen nur, wer vorher hier auf „zusagen“ getippt hat (Cookie), nicht schon wegen
  // eines präparierten Links mit ?zusagen=1.
  const intended = (await cookies()).get(JOIN_INTENT_COOKIE)?.value === id;
  const campaign = campaignTag(quelle);
  const next = publicEventPath(id, { zusagen: true, campaign });
  const full = isMeetupFull(meetup.count, meetup.maxParticipants);

  return (
    <>
      <p className="text-muted-foreground text-sm">{meetup.communityName}</p>
      <div className="mt-2 flex items-start gap-4">
        <span className="pt-1">
          <MeetupDate startsAt={meetup.startsAt} />
        </span>
        <div className="min-w-0">
          <h1 className="text-titel font-semibold break-words">{meetup.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {longDate.format(new Date(meetup.startsAt))}, {meetupTimeRange(meetup.startsAt, meetup.durationMinutes)}
            &nbsp;Uhr
          </p>
          {meetup.weekly && <p className="text-muted-foreground mt-1 text-sm">{describeWeekly(meetup.startsAt)}</p>}
        </div>
      </div>

      <dl className="mt-6">
        {meetupDetailRows(meetup).map((row) => (
          <div key={row.label} className="flex min-h-14 items-center gap-4 border-b py-3">
            <dt className="text-muted-foreground w-24 shrink-0 text-sm">{row.label}</dt>
            <dd className="num min-w-0 break-words">{row.value}</dd>
          </div>
        ))}
        {meetup.place && (
          <div className="flex min-h-14 items-center gap-4 border-b py-3">
            <dt className="text-muted-foreground w-24 shrink-0 text-sm">Treffpunkt</dt>
            <dd className="min-w-0 break-words">{meetup.place}</dd>
          </div>
        )}
        <div className="flex min-h-14 items-center gap-4 border-b py-3">
          <dt className="text-muted-foreground w-24 shrink-0 text-sm">Zusagen</dt>
          <dd className="num">{describeMeetupCount(meetup.count, meetup.maxParticipants)}</dd>
        </div>
      </dl>

      <div className="mt-8">
        {full ? (
          <p className="text-muted-foreground">Dieses Training ist voll.</p>
        ) : signedIn ? (
          <div className="space-y-3">
            <p className="text-sm">
              Wer noch nicht Mitglied ist, tritt mit der Zusage der Community „{meetup.communityName}“ bei.
            </p>
            <PublicMeetupJoin meetupId={id} campaign={campaign} autoJoin={zusagen === "1" && intended} />
          </div>
        ) : (
          <div className="space-y-4">
            <PublicMeetupAuthLinks meetupId={id} next={next} />
            <p className="text-muted-foreground text-sm">
              OHealth ist kostenlos. Wer dabei ist, siehst du nach der Zusage.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
