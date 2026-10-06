import { Check } from "lucide-react";
import Link from "next/link";

import { describeMeetupCount, describeMeetupDetails, formatMeetupWhen, isMeetupFull, meetupDateBlock } from "../logic";
import type { ChatSummary, Meetup } from "../queries";
import { ChatLine } from "./chat-link";
import { MeetupToggle } from "./meetup-forms";
import { SportDot } from "./sport-dot";

/** Datumsblock: Tag groß und schmal, Monat klein darunter. */
export function MeetupDate({ startsAt }: { startsAt: string }) {
  const { day, month } = meetupDateBlock(startsAt);
  return (
    <span className="flex w-10 shrink-0 flex-col items-center leading-none" aria-hidden>
      <span className="num-display text-2xl">{day}</span>
      <span className="text-muted-foreground mt-1 text-xs font-medium">{month}</span>
    </span>
  );
}

function Joined() {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium">
      <Check size={20} strokeWidth={1.5} aria-hidden />
      Dabei
    </span>
  );
}

/**
 * Geplante Trainings als Zeilen, nächstes zuerst. Darunter Sportart und Angaben („Laufen · 60 min ·
 * 10 km“), dann wer plant, wann, wo, wie viele dabei.
 * Mit chats steht darunter der Chat des Trainings: für alle, die dabei sind, mit letzter Nachricht;
 * sonst der Hinweis, dass der Chat nach der Zusage offen ist.
 */
export function MeetupList({
  label,
  meetups,
  chats,
}: {
  label: string;
  meetups: readonly Meetup[];
  chats?: Record<string, ChatSummary>;
}) {
  return (
    <ul aria-label={label}>
      {meetups.map((m) => {
        const full = isMeetupFull(m.count, m.maxParticipants);
        const meta = [
          m.isMine ? "Du" : m.creatorName,
          formatMeetupWhen(m.startsAt),
          m.seriesId ? "jede Woche" : null,
          m.place,
          describeMeetupCount(m.count, m.maxParticipants),
        ].filter(Boolean);
        const details = describeMeetupDetails(m);

        return (
          <li key={m.id} className="flex min-h-16 items-center gap-4 border-b py-3">
            <MeetupDate startsAt={m.startsAt} />
            <div className="min-w-0 flex-1">
              <Link href={`/plan/${m.id}`} className="group block">
                <span className="line-clamp-2 block font-medium break-words group-hover:underline group-hover:underline-offset-4">
                  {m.title}
                </span>
                {details && (
                  <span className="num mt-0.5 flex items-center gap-2 text-sm">
                    <SportDot category={m.sportCategory} />
                    {details}
                  </span>
                )}
                <span className="text-muted-foreground mt-0.5 block text-sm">{meta.join(" · ")}</span>
              </Link>
              {chats && m.isJoined && chats[m.id] && <ChatLine chat={chats[m.id]} title={m.title} />}
              {chats && !m.isJoined && <p className="text-muted-foreground mt-1 text-sm">Chat nach Zusage</p>}
            </div>
            <span className="shrink-0">
              {m.isJoined ? (
                <Joined />
              ) : full ? (
                <span className="text-muted-foreground text-sm">Voll</span>
              ) : (
                <MeetupToggle meetupId={m.id} joined={false} title={m.title} />
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
