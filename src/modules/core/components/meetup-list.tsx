import { Check } from "lucide-react";
import Link from "next/link";

import { describeMeetupCount, formatMeetupWhen, isMeetupFull, meetupDateBlock } from "../logic";
import type { Meetup } from "../queries";
import { MeetupToggle } from "./meetup-forms";

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
 * Treffen als Zeilen. Mit showCommunity steht die Community statt des Treffpunkts in der
 * zweiten Zeile (Übersicht über alle Communities).
 */
export function MeetupList({
  label,
  meetups,
  showCommunity = false,
}: {
  label: string;
  meetups: readonly (Meetup & { communityName: string })[];
  showCommunity?: boolean;
}) {
  return (
    <ul aria-label={label}>
      {meetups.map((m) => {
        const full = isMeetupFull(m.count, m.maxParticipants);
        const meta = showCommunity
          ? [m.communityName, formatMeetupWhen(m.startsAt)]
          : [formatMeetupWhen(m.startsAt), m.place, describeMeetupCount(m.count, m.maxParticipants)];

        return (
          <li key={m.id} className="flex min-h-16 items-center gap-4 border-b py-3">
            <MeetupDate startsAt={m.startsAt} />
            <Link href={`/community/${m.groupId}/treffen/${m.id}`} className="group min-w-0 flex-1">
              <span className="line-clamp-2 block font-medium break-words group-hover:underline group-hover:underline-offset-4">
                {m.title}
              </span>
              <span className="text-muted-foreground mt-0.5 block text-sm">{meta.join(" · ")}</span>
            </Link>
            <span className="shrink-0">
              {m.isJoined ? (
                <Joined />
              ) : full ? (
                <span className="text-muted-foreground text-sm">Voll</span>
              ) : (
                <MeetupToggle meetupId={m.id} groupId={m.groupId} joined={false} title={m.title} />
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
