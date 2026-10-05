import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ChatThread } from "@/modules/core/components/chat-thread";
import { MarkChatRead, MarkMeetupRead } from "@/modules/core/components/notification-actions";
import { describeMeetupCount, formatMeetupWhen } from "@/modules/core/logic";
import { getChat, getMeetup, getMyCommunity, requireUser } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Chat" };

/** Kopfzeile: worum es im Chat geht, mit Link dorthin. */
async function chatHeader(chat: { kind: "meetup" | "community"; meetupId: string | null; groupId: string | null }) {
  if (chat.kind === "meetup" && chat.meetupId) {
    const meetup = await getMeetup(chat.meetupId);
    if (!meetup) return null;
    return {
      href: `/plan/${meetup.id}`,
      backLabel: "Zum Training",
      title: meetup.title,
      detail: `${formatMeetupWhen(meetup.startsAt)} · ${describeMeetupCount(meetup.count, meetup.maxParticipants)} · ${meetup.participants
        .map((p) => (p.isMe ? "Du" : p.name))
        .join(", ")}`,
      emptyHint: "Noch keine Nachrichten. Schreib den anderen, zum Beispiel wo ihr euch genau trefft.",
      canModerate: false,
    };
  }
  if (chat.groupId) {
    const community = await getMyCommunity(chat.groupId);
    if (!community) return null;
    return {
      href: `/community/${community.id}`,
      backLabel: "Zur Community",
      title: community.name,
      detail: `${community.memberCount} ${community.memberCount === 1 ? "Mitglied" : "Mitglieder"}`,
      emptyHint: "Noch keine Nachrichten. Alle Mitglieder der Community lesen hier mit.",
      // Die Verwaltung darf jede Nachricht löschen (Migration community_chat)
      canModerate: community.role === "admin" || community.role === "coach",
    };
  }
  return null;
}

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [{ userId }, chat] = await Promise.all([requireUser(), getChat(id)]);
  if (!chat) notFound();
  const header = await chatHeader(chat);
  if (!header) notFound();
  const version = chat.messages.at(-1)?.id ?? "";

  return (
    <div className="flex min-h-[calc(100dvh-6.75rem-env(safe-area-inset-bottom))] max-w-2xl flex-col md:min-h-[calc(100dvh-6.75rem)]">
      <MarkChatRead chatId={chat.id} version={version} />
      {chat.meetupId && <MarkMeetupRead meetupId={chat.meetupId} version={version} />}
      <header className="bg-background sticky top-0 z-10 -mx-5 flex items-center gap-1 border-b px-2 py-2 md:mx-0 md:px-0">
        <Link
          href="/chats"
          aria-label="Zurück zu den Chats"
          className="hover:bg-accent inline-flex size-11 shrink-0 items-center justify-center rounded-lg"
        >
          <ChevronLeft size={20} strokeWidth={1.5} aria-hidden />
        </Link>
        <Link href={header.href} className="min-w-0 py-1" aria-label={`${header.title}, ${header.backLabel}`}>
          <h1 className="truncate font-semibold">{header.title}</h1>
          <p className="text-muted-foreground truncate text-sm">{header.detail}</p>
        </Link>
      </header>
      <ChatThread
        chatId={chat.id}
        myUserId={userId}
        messages={chat.messages}
        now={new Date().toISOString()}
        emptyHint={header.emptyHint}
        canModerate={header.canModerate}
      />
    </div>
  );
}
