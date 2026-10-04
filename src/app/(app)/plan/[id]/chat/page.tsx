import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getMeetup } from "@/modules/core/queries";

/** Frühere Adresse des Event-Chats (alte Pushs, Lesezeichen). Der Chat liegt jetzt unter /chats. */
export default async function MeetupChatRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const meetup = await getMeetup(id);
  if (!meetup) notFound();
  redirect(meetup.isJoined && meetup.chatId ? `/chats/${meetup.chatId}` : `/plan/${id}`);
}
