import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { MeetupChat } from "@/modules/core/components/meetup-chat";
import { MarkChatRead, MarkMeetupRead } from "@/modules/core/components/notification-actions";
import { describeMeetupCount, formatMeetupWhen } from "@/modules/core/logic";
import { getMeetup, requireUser } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Chat" };

export default async function MeetupChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [{ userId }, meetup] = await Promise.all([requireUser(), getMeetup(id)]);
  if (!meetup) notFound();
  // Den Chat sehen nur alle, die dabei sind. Er entsteht, sobald jemand außer der planenden Person zusagt.
  if (!meetup.isJoined || !meetup.chatId) redirect(`/plan/${id}`);
  const version = meetup.messages.at(-1)?.id ?? "";

  return (
    <div className="flex min-h-[calc(100dvh-6.75rem-env(safe-area-inset-bottom))] max-w-2xl flex-col md:min-h-[calc(100dvh-6.75rem)]">
      <MarkMeetupRead meetupId={meetup.id} version={version} />
      <MarkChatRead chatId={meetup.chatId} version={version} />
      <header className="bg-background sticky top-0 z-10 -mx-5 flex items-center gap-1 border-b px-2 py-2 md:mx-0 md:px-0">
        <Link
          href={`/plan/${id}`}
          aria-label="Zurück zum Training"
          className="hover:bg-accent inline-flex size-11 shrink-0 items-center justify-center rounded-lg"
        >
          <ChevronLeft size={20} strokeWidth={1.5} aria-hidden />
        </Link>
        <Link href={`/plan/${id}`} className="min-w-0 py-1">
          <h1 className="truncate font-semibold">{meetup.title}</h1>
          <p className="text-muted-foreground truncate text-sm">
            {formatMeetupWhen(meetup.startsAt)} · {describeMeetupCount(meetup.count, meetup.maxParticipants)} ·{" "}
            {meetup.participants.map((p) => (p.isMe ? "Du" : p.name)).join(", ")}
          </p>
        </Link>
      </header>
      <MeetupChat chatId={meetup.chatId} meetupId={meetup.id} myUserId={userId} messages={meetup.messages} now={new Date().toISOString()} />
    </div>
  );
}
