import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { DeleteMeetup, MeetupToggle } from "@/modules/core/components/meetup-forms";
import { MeetupDate } from "@/modules/core/components/meetup-list";
import { describeMeetupCount, formatMeetupWhen, isMeetupFull } from "@/modules/core/logic";
import { getMeetup, getMyCommunity } from "@/modules/core/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Treffen" };

export default async function MeetupPage({ params }: { params: Promise<{ id: string; meetupId: string }> }) {
  const { id, meetupId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(meetupId).success) notFound();

  const [community, meetup] = await Promise.all([getMyCommunity(id), getMeetup(meetupId)]);
  if (!community || !meetup || meetup.groupId !== id) notFound();

  const isPast = new Date(meetup.startsAt) <= new Date();
  const full = isMeetupFull(meetup.count, meetup.maxParticipants);
  const canManage = meetup.isMine || community.role === "admin" || community.role === "coach";
  const date = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(meetup.startsAt));

  return (
    <>
      <p className="text-sm">
        <Link
          href={`/community/${id}`}
          className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4"
        >
          {community.name}
        </Link>
      </p>

      <div className="mt-2 flex max-w-2xl items-start gap-4">
        <span className="pt-1">
          <MeetupDate startsAt={meetup.startsAt} />
        </span>
        <div className="min-w-0">
          <h1 className="text-titel font-semibold break-words">{meetup.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {date}, {formatMeetupWhen(meetup.startsAt).split(" ")[1]}&nbsp;Uhr
          </p>
        </div>
      </div>

      <dl className="mt-6 max-w-2xl">
        <div className="flex min-h-14 items-center gap-4 border-b">
          <dt className="text-muted-foreground w-28 shrink-0 text-sm">Treffpunkt</dt>
          <dd className="min-w-0 break-words">{meetup.place}</dd>
        </div>
        {meetup.note && (
          <div className="flex min-h-14 items-center gap-4 border-b py-3">
            <dt className="text-muted-foreground w-28 shrink-0 text-sm">Notiz</dt>
            <dd className="min-w-0 break-words">{meetup.note}</dd>
          </div>
        )}
        <div className="flex min-h-14 items-center gap-4 border-b">
          <dt className="text-muted-foreground w-28 shrink-0 text-sm">Zusagen</dt>
          <dd className="num">{describeMeetupCount(meetup.count, meetup.maxParticipants)}</dd>
        </div>
      </dl>

      <div className="mt-6 max-w-2xl space-y-3">
        {isPast ? (
          <p className="text-muted-foreground">Dieses Treffen hat schon stattgefunden.</p>
        ) : meetup.isJoined ? (
          <>
            <p>Du bist dabei.</p>
            <MeetupToggle meetupId={meetup.id} groupId={id} joined title={meetup.title} primary />
          </>
        ) : full ? (
          <p className="text-muted-foreground">Dieses Treffen ist voll.</p>
        ) : (
          <MeetupToggle meetupId={meetup.id} groupId={id} joined={false} title={meetup.title} primary />
        )}
        {!isPast && (
          <p>
            <a
              href={`/community/${id}/treffen/${meetup.id}/kalender`}
              className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
            >
              In Kalender eintragen
            </a>
          </p>
        )}
      </div>

      <section className="mt-10 max-w-2xl" aria-labelledby="dabei">
        <h2 id="dabei" className="text-xl font-semibold">
          Dabei
        </h2>
        <ul className="mt-2" aria-label="Dabei">
          {meetup.participants.map((p) => (
            <li key={p.userId} className={cn("flex min-h-14 items-center border-b", p.isMe && "text-brand")}>
              {p.isMe ? "Du" : p.name}
            </li>
          ))}
        </ul>
      </section>

      {canManage && (
        <section className="mt-12 max-w-2xl" aria-label="Verwalten">
          <DeleteMeetup meetupId={meetup.id} groupId={id} />
        </section>
      )}
    </>
  );
}
