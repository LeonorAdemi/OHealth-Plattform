import Link from "next/link";

import { MeetupDate } from "@/modules/core/components/meetup-list";
import { formatMeetupWhen } from "@/modules/core/logic";
import type { getProfileStats } from "@/modules/core/queries";

import { formatNumber, formatWeight, weekGrid, weekStreak } from "../logic";
import { WeekGrid } from "./week-grid";

type Stats = NonNullable<Awaited<ReturnType<typeof getProfileStats>>>;

/**
 * Inhalt eines Profils statt Bildraster: Trainingstage dieser Woche mit Serie, Top-Bestwerte,
 * kommende Events und Communities. Ohne Recht auf die Inhalte ein Hinweis, dass das Konto privat ist.
 */
export function ProfileTiles({ stats, name, isMe }: { stats: Stats; name: string; isMe: boolean }) {
  if (!stats.canSee) {
    return (
      <p className="text-muted-foreground max-w-xl">
        Dieses Konto ist privat. Folge {name}, um Trainingstage, Bestwerte und kommende Events zu sehen.
      </p>
    );
  }

  const now = new Date();
  const days = weekGrid(stats.days, now);
  const count = days.filter(Boolean).length;
  const streak = weekStreak(stats.days, now);

  return (
    <div className="space-y-10">
      <section aria-label="Trainingstage">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="num-display text-grosszahl">{count}</p>
            <p className="mt-1">{count === 1 ? "Trainingstag" : "Trainingstage"} diese Woche</p>
            <div className="mt-3">
              <WeekGrid days={days} own={isMe} size="lg" />
            </div>
          </div>
          <div>
            <p className="num-display text-zahl">{streak}</p>
            <p className="mt-1">{streak === 1 ? "Woche" : "Wochen"} in Folge</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="bestwerte">
        <h2 id="bestwerte" className="text-xl font-semibold">
          Bestwerte
        </h2>
        {stats.bests.length === 0 ? (
          <p className="text-muted-foreground mt-2">Noch keine Bestwerte mit Gewicht.</p>
        ) : (
          <ol className="mt-2">
            {stats.bests.map((b) => (
              <li key={b.exercise} className="flex min-h-14 items-center gap-4 border-b">
                <span className="min-w-0 flex-1 truncate">{b.exercise}</span>
                <span className="text-right">
                  <span className="num-display text-2xl">{formatNumber(b.e1rm, 1)}</span>
                  <span className="text-muted-foreground text-sm">{" "}kg</span>
                  {b.maxWeight !== null && (
                    <span className="text-muted-foreground block text-xs">
                      schwerster Satz {formatWeight(b.maxWeight)}
                      {" "}kg
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
        {stats.bests.length > 0 && (
          <p className="text-muted-foreground mt-2 text-sm">Geschätztes Maximum für eine Wiederholung.</p>
        )}
      </section>

      <section aria-labelledby="events">
        <h2 id="events" className="text-xl font-semibold">
          Kommende Events
        </h2>
        {stats.events.length === 0 ? (
          <p className="text-muted-foreground mt-2">Keine geplanten Trainings in öffentlichen Communities.</p>
        ) : (
          <ul className="mt-2">
            {stats.events.map((e) => {
              const content = (
                <>
                  <MeetupDate startsAt={e.startsAt} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{e.title}</span>
                    <span className="text-muted-foreground block text-sm">
                      {[formatMeetupWhen(e.startsAt), e.place].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={e.id} className="border-b">
                  {e.href ? (
                    <Link
                      href={e.href}
                      className="hover:bg-accent -mx-2 flex min-h-16 items-center gap-4 rounded-lg px-2 py-3 transition-colors duration-150 ease-out"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex min-h-16 items-center gap-4 py-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {stats.communities.length > 0 && (
        <section aria-labelledby="communities">
          <h2 id="communities" className="text-xl font-semibold">
            Communities
          </h2>
          <ul className="mt-2">
            {stats.communities.map((c) => (
              <li key={c.id} className="border-b">
                <Link
                  href={c.href}
                  className="hover:bg-accent -mx-2 flex min-h-14 items-center rounded-lg px-2 transition-colors duration-150 ease-out"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
