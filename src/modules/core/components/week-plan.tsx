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
 * Wochenplan: oben ein Streifen Montag bis Sonntag mit Datum und je Tag einem Feld (gefüllt: erledigt,
 * Rahmen: geplant). Ein Tipp auf einen Tag mit Einträgen springt zu ihm, auf einen freien Tag ab heute
 * plant ein Training. Darunter nur die Tage mit Einträgen und heute; unter dem Titel steht die
 * Uhrzeit oder „Erledigt“. Heute ist fett.
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
  const listed = days.filter((day) => (items[day.date]?.length ?? 0) > 0 || day.isToday);

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

      <ol className="mt-2 grid grid-cols-7 border-b pb-2" aria-label="Tage der Woche">
        {days.map((day) => (
          <li key={day.date} className="flex justify-center">
            <StripDay day={day} entries={items[day.date] ?? []} canPlan={day.date >= minDate} />
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground mt-2 flex gap-4 text-xs font-medium" aria-hidden>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-foreground size-2.5 rounded-[2px]" /> Erledigt
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="border-foreground size-2.5 rounded-[2px] border-[1.5px]" /> Geplant
        </span>
      </p>

      {listed.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">In dieser Woche ist nichts eingetragen.</p>
      ) : (
        <ol className="mt-2">
          {listed.map((day) => {
            const entries = items[day.date] ?? [];
            return (
              <li key={day.date} id={`tag-${day.date}`} className="flex min-h-14 scroll-mt-20 gap-3 border-b py-2">
                <span className={cn("w-16 shrink-0 pt-2.5 text-sm", day.isToday ? "font-semibold" : "text-muted-foreground")}>
                  {day.isToday ? "Heute" : day.label}
                </span>
                <span className="min-w-0 flex-1">
                  {entries.length === 0 ? (
                    <span className="text-muted-foreground block pt-2.5 text-sm">Nichts geplant</span>
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
      )}
    </section>
  );
}

/** Ein Tag im Wochenstreifen: Wochentag, Datum und ein Feld für erledigt, geplant oder frei. */
function StripDay({ day, entries, canPlan }: { day: PlanDay; entries: readonly PlanItem[]; canPlan: boolean }) {
  const done = entries.filter((e) => e.done).length;
  const planned = entries.length - done;
  const dayNumber = Number(day.date.slice(8, 10));
  const status = [done > 0 ? `${done} erledigt` : null, planned > 0 ? `${planned} geplant` : null]
    .filter(Boolean)
    .join(", ");

  const content = (
    <>
      <span className={cn("text-xs font-medium", day.isToday ? "text-foreground" : "text-muted-foreground")}>
        {day.weekday}
      </span>
      <span className={cn("num text-base", day.isToday && "font-semibold underline underline-offset-4")}>{dayNumber}</span>
      <span
        className={cn(
          "size-2.5 rounded-[2px]",
          done > 0 ? "bg-foreground" : planned > 0 ? "border-foreground border-[1.5px]" : "bg-muted",
        )}
      />
    </>
  );
  const className = "flex min-h-16 w-11 flex-col items-center justify-center gap-1 rounded-lg";

  if (entries.length > 0) {
    return (
      <a href={`#tag-${day.date}`} className={cn(className, "hover:bg-accent")} aria-label={`${day.label}: ${status}`}>
        {content}
      </a>
    );
  }
  if (canPlan) {
    return (
      <Link
        href={`/plan/neu?tag=${day.date}`}
        className={cn(className, "hover:bg-accent")}
        aria-label={`${day.label}: frei, Training planen`}
      >
        {content}
      </Link>
    );
  }
  return (
    <span className={className} aria-label={`${day.label}: frei`} role="img">
      {content}
    </span>
  );
}
