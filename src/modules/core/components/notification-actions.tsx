"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/result";

import { markAllNotificationsRead, markChatRead, markMeetupNotificationsRead, updateNotificationPrefs } from "../actions";
import { CHAT_READ } from "./unread-chats-badge";

export const NOTIFICATIONS_READ = "ohealth:notifications-read";

/** Markiert beim Öffnen alles als gelesen. Die Seite zeigt "Neu" noch für diesen Besuch. */
export function MarkAllRead({ hasUnread }: { hasUnread: boolean }) {
  const sent = useRef(false);
  useEffect(() => {
    if (hasUnread && !sent.current) {
      sent.current = true;
      void markAllNotificationsRead().then(() => window.dispatchEvent(new Event(NOTIFICATIONS_READ)));
    }
  }, [hasUnread]);
  return null;
}

/** Merkt sich, dass der Chat bis zur neuesten Nachricht gelesen ist, solange man ihn ansieht. */
export function MarkChatRead({ chatId, version }: { chatId: string; version: string }) {
  useEffect(() => {
    markChatRead(chatId).then(() => window.dispatchEvent(new Event(CHAT_READ)), () => {});
  }, [chatId, version]);
  return null;
}

/** Markiert die Mitteilungen zu einem Training als gelesen, solange man es ansieht. */
export function MarkMeetupRead({ meetupId, version }: { meetupId: string; version: string }) {
  useEffect(() => {
    void markMeetupNotificationsRead(meetupId);
  }, [meetupId, version]);
  return null;
}

type Prefs = {
  newTrainingPrivate: boolean;
  newTrainingPublic: boolean;
  joined: boolean;
  message: boolean;
  cancelled: boolean;
  reminder: boolean;
  communityMessage: boolean;
  friends: boolean;
  directMessage: boolean;
};

const OPTIONS: { name: keyof Prefs; label: string; hint?: string }[] = [
  { name: "newTrainingPrivate", label: "Neue Trainings in privaten Communities" },
  {
    name: "newTrainingPublic",
    label: "Neue Trainings in öffentlichen Communities",
    hint: "In großen Communities können das viele sein.",
  },
  { name: "joined", label: "Jemand sagt bei meinem Training zu" },
  {
    name: "message",
    label: "Neue Nachrichten im Chat eines Trainings",
    hint: "Als Push aufs Handy. In der App zeigt der Tab Chats neue Nachrichten.",
  },
  {
    name: "communityMessage",
    label: "Neue Nachrichten im Chat einer Community",
    hint: "Als Push aufs Handy. In großen Communities können das viele sein.",
  },
  {
    name: "directMessage",
    label: "Neue Privatnachrichten und Nachrichtenanfragen",
    hint: "Als Push aufs Handy. In der App zeigt der Tab Chats neue Nachrichten.",
  },
  { name: "friends", label: "Neue Follower und Folgen-Anfragen" },
  { name: "cancelled", label: "Ein Training, bei dem ich dabei bin, wird abgesagt oder verlegt" },
  { name: "reminder", label: "Erinnerung vor und Nachfrage nach dem Training" },
];

const initial: FormState = {};

export function NotificationPrefsForm({ prefs }: { prefs: Prefs }) {
  const [state, action, pending] = useActionState(updateNotificationPrefs, initial);

  return (
    <form action={action} className="space-y-3">
      <fieldset>
        <legend className="sr-only">Mitteilungen bekommen für</legend>
        <ul>
          {OPTIONS.map((o) => (
            <li key={o.name}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
                <input
                  type="checkbox"
                  name={o.name}
                  defaultChecked={prefs[o.name]}
                  className="accent-primary size-5 shrink-0"
                />
                <span>
                  <span className="block">{o.label}</span>
                  {o.hint && <span className="text-muted-foreground block text-sm">{o.hint}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="outline" disabled={pending}>
        Einstellungen speichern
      </Button>
    </form>
  );
}
