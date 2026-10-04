import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DeleteMeetup,
  MeetupToggle,
  RemoveFromCommunity,
  ShareSettings,
} from "@/modules/core/components/meetup-forms";
import { ChatRow } from "@/modules/core/components/chat-link";
import { MeetupDate } from "@/modules/core/components/meetup-list";
import { MarkMeetupRead } from "@/modules/core/components/notification-actions";
import { COMMUNITY_KIND_LABEL, describeMeetupCount, isMeetupFull } from "@/modules/core/logic";
import { getChatSummaries, getMeetup, getMyCommunities } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Training" };

const longDate = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
});

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [meetup, communities, chats] = await Promise.all([getMeetup(id), getMyCommunities(), getChatSummaries()]);
  if (!meetup) notFound();

  const isPast = new Date(meetup.startsAt) <= new Date();
  const full = isMeetupFull(meetup.count, meetup.maxParticipants);
  const sharedIn = communities.filter((c) => meetup.sharedWith.includes(c.id));
  const managed = meetup.isMine ? [] : sharedIn.filter((c) => c.role === "admin" || c.role === "coach");
  const hasCompany = meetup.shareCount > 0 || meetup.count > 1;
  const chat = chats.byMeetup[id];

  return (
    <>
      <MarkMeetupRead meetupId={meetup.id} version={`${meetup.count}-${chat?.preview ?? ""}`} />
      <p className="text-sm">
        <Link href="/" className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4">
          Heute
        </Link>
      </p>

      <div className="mt-2 flex max-w-2xl items-start gap-4">
        <span className="pt-1">
          <MeetupDate startsAt={meetup.startsAt} />
        </span>
        <div className="min-w-0">
          <h1 className="text-titel font-semibold break-words">{meetup.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {longDate.format(new Date(meetup.startsAt))}&nbsp;Uhr · {meetup.isMine ? "von dir" : `von ${meetup.creatorName}`}
          </p>
        </div>
      </div>

      <dl className="mt-6 max-w-2xl">
        {meetup.place && (
          <div className="flex min-h-14 items-center gap-4 border-b py-3">
            <dt className="text-muted-foreground w-28 shrink-0 text-sm">Treffpunkt</dt>
            <dd className="min-w-0 break-words">{meetup.place}</dd>
          </div>
        )}
        {meetup.note && (
          <div className="flex min-h-14 items-center gap-4 border-b py-3">
            <dt className="text-muted-foreground w-28 shrink-0 text-sm">Notiz</dt>
            <dd className="min-w-0 break-words">{meetup.note}</dd>
          </div>
        )}
        <div className="flex min-h-14 items-center gap-4 border-b py-3">
          <dt className="text-muted-foreground w-28 shrink-0 text-sm">Geteilt</dt>
          <dd className="min-w-0 break-words">
            {meetup.shareCount === 0 ? "Privat, nur für dich" : sharedIn.map((c) => c.name).join(", ") || "In einer deiner Communities"}
          </dd>
        </div>
        {hasCompany && (
          <div className="flex min-h-14 items-center gap-4 border-b py-3">
            <dt className="text-muted-foreground w-28 shrink-0 text-sm">Zusagen</dt>
            <dd className="num">{describeMeetupCount(meetup.count, meetup.maxParticipants)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 max-w-2xl space-y-3">
        {isPast ? (
          <p className="text-muted-foreground">Dieses Training liegt in der Vergangenheit.</p>
        ) : meetup.isMine ? (
          meetup.templateId && (
            <Button asChild className="w-full md:w-auto">
              <Link href={`/vorlagen/${meetup.templateId}`}>Training starten</Link>
            </Button>
          )
        ) : meetup.isJoined ? (
          <>
            <p>Du bist dabei.</p>
            <MeetupToggle meetupId={meetup.id} joined title={meetup.title} primary />
          </>
        ) : full ? (
          <p className="text-muted-foreground">Dieses Training ist voll.</p>
        ) : (
          <MeetupToggle meetupId={meetup.id} joined={false} title={meetup.title} primary />
        )}
        {!isPast && (
          <p>
            <a
              href={`/plan/${meetup.id}/kalender`}
              className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
            >
              In Kalender eintragen
            </a>
          </p>
        )}
      </div>

      {hasCompany && (
        <section className="mt-10 max-w-2xl" aria-labelledby="chat">
          <h2 id="chat" className="text-xl font-semibold">
            Chat
          </h2>
          {meetup.isJoined && chat ? (
            <div className="mt-2">
              <ChatRow
                chat={chat}
                label="Zum Chat"
                emptyText="Nur für alle, die dabei sind. Sprecht euch ab, wo ihr euch trefft."
              />
            </div>
          ) : meetup.isJoined ? (
            <p className="text-muted-foreground mt-2">Der Chat startet, sobald jemand zusagt.</p>
          ) : (
            <p className="text-muted-foreground mt-2">Sag zu, dann kannst du mit den anderen schreiben.</p>
          )}
        </section>
      )}

      {hasCompany && (
        <section className="mt-10 max-w-2xl" aria-labelledby="dabei">
          <h2 id="dabei" className="text-xl font-semibold">
            Dabei
          </h2>
          <ul className="mt-2" aria-label="Dabei">
            {meetup.participants.map((p) => (
              <li key={p.userId} className={cn("flex min-h-14 items-center border-b", p.isMe && "text-brand")}>
                {p.isMe ? (
                  "Du"
                ) : (
                  <Link href={`/person/${p.userId}`} className="hover:underline hover:underline-offset-4">
                    {p.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {meetup.isMine && !isPast && (
        <section className="mt-10 max-w-2xl" aria-labelledby="teilen">
          <h2 id="teilen" className="text-xl font-semibold">
            Teilen mit
          </h2>
          <p className="text-muted-foreground mt-1 mb-2 text-sm">
            Ohne Häkchen bleibt das Training privat. Wer schon zugesagt hat, bleibt dabei.
          </p>
          <ShareSettings
            meetupId={meetup.id}
            communities={communities.map((c) => ({ id: c.id, name: c.name, kindLabel: COMMUNITY_KIND_LABEL[c.kind] }))}
            selected={meetup.sharedWith}
          />
        </section>
      )}

      {(meetup.isMine || managed.length > 0) && (
        <section className="mt-12 max-w-2xl space-y-2" aria-label="Verwalten">
          {managed.map((c) => (
            <RemoveFromCommunity key={c.id} meetupId={meetup.id} groupId={c.id} name={c.name} />
          ))}
          {meetup.isMine && <DeleteMeetup meetupId={meetup.id} shared={hasCompany} />}
        </section>
      )}
    </>
  );
}
