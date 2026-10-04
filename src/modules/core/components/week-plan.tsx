import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import type { PlanDay } from "../logic";

export type PlanItem = {
  key: string;
  href: string;
  time: string;
  title: string;
  meta: string;
  done: boolean;
};

/**
 * Wochenplan: Montag bis Sonntag, je Tag geplante und erledigte Trainings.
 * Unter dem Titel steht die Uhrzeit oder „Erledigt“. Heute ist fett.
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
          {nextHref && (
            <Link
              href={nextHref}
              scroll={false}
              aria-label="Nächste Woche"
              className="hover:bg-accent inline-flex size-11 items-center justify-center rounded-lg"
            >
              <ChevronRight size={20} strokeWidth={1.5} aria-hidden />
            </Link>
          )}
        </span>
      </div>

      <ol className="mt-2">
        {days.map((day) => {
          const entries = items[day.date] ?? [];
          return (
            <li key={day.date} className="flex min-h-14 gap-3 border-b py-2">
              <span className={cn("w-16 shrink-0 pt-2.5 text-sm", day.isToday ? "font-semibold" : "text-muted-foreground")}>
                {day.label}
                {day.isToday && <span className="sr-only"> (heute)</span>}
              </span>
              <span className="min-w-0 flex-1">
                {entries.length === 0 ? (
                  <span className="text-muted-foreground block pt-2.5 text-sm">–</span>
                ) : (
                  <ul>
                    {entries.map((item) => (
                      <li key={item.key}>
                        <Link href={item.href} className="group block py-1.5">
                          <span className="block break-words group-hover:underline group-hover:underline-offset-4">
                            {item.title}
                          </span>
                          <span className="text-muted-foreground block text-sm">
                            {[item.done ? "Erledigt" : item.time, item.meta].filter(Boolean).join(" · ")}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </span>
              {day.date < minDate ? (
                <span className="size-11 shrink-0" />
              ) : (
              <Link
                href={`/plan/neu?tag=${day.date}`}
                aria-label={`Training am ${day.label} planen`}
                className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-lg"
              >
                <Plus size={20} strokeWidth={1.5} aria-hidden />
              </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
