import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { type PlanDay, type SportCategory } from "../logic";
import { MarkDoneButton } from "./meetup-forms";
import { SportDot } from "./sport-dot";

export type PlanItem = {
  key: string;
  href: string;
  time: string;
  title: string;
  meta: string;
  done: boolean;
  category?: SportCategory;
  /** Geplantes Training, das vorbei und noch nicht beantwortet ist: lässt sich abhaken. */
  confirmMeetupId?: string;
};

/**
 * Wochenplan als Liste Montag bis Sonntag. Erledigtes trägt ein gefülltes Häkchen, Geplantes die
 * Uhrzeit und, sobald es vorbei ist, einen leeren Kreis zum Abhaken. Freie Tage ab heute haben
 * „Planen“. Heute ist fett.
 */
export function WeekPlan({
  title,
  days,
  items,
  prevHref,
  nextHref,
  minDate,
}: {
  title: string;
  days: readonly PlanDay[];
  items: Readonly<Record<string, readonly PlanItem[]>>;
  prevHref: string | null;
  nextHref: string | null;
  /** Vor diesem Tag lässt sich nichts mehr planen. */
  minDate: string;
}) {
  return (
    <section aria-labelledby="wochenplan">
      <div className="flex items-center justify-between gap-2">
        <h2 id="wochenplan" className="text-xl font-semibold">
          {title}
        </h2>
        <span className="flex">
          {prevHref ? (
            <Link
              href={prevHref}
              scroll={false}
              aria-label="Vorige Woche"
              className="hover:bg-accent inline-flex size-11 items-center justify-center rounded-lg"
            >
              <ChevronLeft size={20} strokeWidth={1.5} aria-hidden />
            </Link>
          ) : (
            <span className="size-11" />
          )}
          {nextHref ? (
            <Link
              href={nextHref}
              scroll={false}
              aria-label="Nächste Woche"
              className="hover:bg-accent inline-flex size-11 items-center justify-center rounded-lg"
            >
              <ChevronRight size={20} strokeWidth={1.5} aria-hidden />
            </Link>
          ) : (
            <span className="size-11" />
          )}
        </span>
      </div>

      <ol className="mt-2 border-t">
        {days.map((day) => {
          const entries = items[day.date] ?? [];
          return (
            <li key={day.date} id={`tag-${day.date}`} className="flex scroll-mt-20 gap-3 border-b">
              <span
                className={cn(
                  "w-14 shrink-0 pt-3.5 text-sm",
                  day.isToday ? "font-semibold underline underline-offset-4" : "text-muted-foreground",
                )}
              >
                {/* „Mo 5.10.“ wird zu „Mo 5.“, der Monat steht schon in der Woche */}
                {day.isToday ? "Heute" : day.label.replace(/(\d+)\.\d+\.$/, "$1.")}
              </span>
              {entries.length === 0 ? (
                <span className="flex min-h-12 flex-1 items-center justify-between gap-3">
                  <span className="text-muted-foreground text-sm">frei</span>
                  {day.date >= minDate && (
                    <Link
                      href={`/plan/neu?tag=${day.date}`}
                      aria-label={`Training am ${day.label} planen`}
                      className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
                    >
                      Planen
                    </Link>
                  )}
                </span>
              ) : (
                <ul className="min-w-0 flex-1 divide-y">
                  {entries.map((item) => (
                    <li key={item.key} className="flex min-h-14 items-center gap-3 py-1.5">
                      <Link href={item.href} className="group min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-medium break-words group-hover:underline group-hover:underline-offset-4">
                          <SportDot category={item.category} />
                          {item.title}
                        </span>
                        <span className="text-muted-foreground block text-sm">
                          {[item.done ? null : item.time, item.meta].filter(Boolean).join(" · ")}
                        </span>
                      </Link>
                      {item.done ? (
                        <span role="img" aria-label="Erledigt" className="inline-flex size-11 shrink-0 items-center justify-center">
                          <span className="bg-foreground text-background inline-flex size-6 items-center justify-center rounded-full">
                            <Check size={16} strokeWidth={2} aria-hidden />
                          </span>
                        </span>
                      ) : item.confirmMeetupId ? (
                        <MarkDoneButton meetupId={item.confirmMeetupId} title={item.title} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
