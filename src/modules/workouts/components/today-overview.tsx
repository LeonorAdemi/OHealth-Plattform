import { cn } from "@/lib/utils";

import {
  daysOfWeek,
  formatDistance,
  formatNumber,
  formatWeight,
  goalStreak,
  heatLevel,
  isoWeekOf,
  type WeekSummary,
} from "../logic";

/**
 * Kennzahlen der laufenden Woche unter der Großzahl: Minuten, Kilometer (nur wenn es in dieser oder
 * der Vorwoche Distanzen gab) und die Serie. Daneben in Stein der genaue Wert der Vorwoche.
 * weeks kommt aus my_weekly_summary, die laufende Woche zuerst.
 */
export function WeekStats({ weeks, goal }: { weeks: readonly WeekSummary[]; goal: number | null }) {
  const [current, previous] = weeks;
  if (!current) return null;
  const streak = goalStreak(weeks, goal ?? 1);
  const showDistance = current.distanceM > 0 || (previous?.distanceM ?? 0) > 0;
  const km = formatDistance(current.distanceM);

  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-6">
      <Stat
        value={formatNumber(current.minutes)}
        unit="min"
        label="Minuten diese Woche"
        before={previous ? `Vorwoche ${formatNumber(previous.minutes)} min` : null}
      />
      {showDistance && (
        <Stat
          value={km.value}
          unit={km.unit}
          label="Distanz diese Woche"
          before={previous ? `Vorwoche ${formatDistance(previous.distanceM).value} ${formatDistance(previous.distanceM).unit}` : null}
        />
      )}
      <Stat
        value={formatNumber(streak)}
        unit={streak === 1 ? "Woche" : "Wochen"}
        label={goal ? "in Folge mit Wochenziel" : "in Folge mit Training"}
        before={null}
      />
    </dl>
  );
}

function Stat({ value, unit, label, before }: { value: string; unit: string; label: string; before: string | null }) {
  return (
    <div className="flex flex-col">
      <dt className="order-2 mt-1 text-sm">{label}</dt>
      <dd className="order-1">
        <span className="num-display text-2xl">{value}</span>
        <span className="text-muted-foreground text-sm">{" "}{unit}</span>
      </dd>
      {before && <dd className="text-muted-foreground order-3 text-sm">{before}</dd>}
    </div>
  );
}

const HEAT_CLASS = ["bg-muted", "bg-brand/25", "bg-brand/50", "bg-brand/75", "bg-brand"] as const;
const WEEKDAY_LABELS = ["Mo", "", "Mi", "", "Fr", "", "So"] as const;
const dayLabel = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });

/**
 * Die letzten Wochen als Heatmap in Moos: Spalten sind Wochen (älteste links), Zeilen Montag bis
 * Sonntag, je kräftiger, desto mehr Minuten. Darunter, in wie vielen Wochen das Ziel erreicht war.
 * weeks kommt aus my_weekly_summary (laufende zuerst), minutesByDay aus my_activity_days.
 */
export function ActivityHeatmap({
  weeks,
  minutesByDay,
  today,
  goal,
}: {
  weeks: readonly WeekSummary[];
  minutesByDay: Readonly<Record<string, number>>;
  today: string;
  goal: number | null;
}) {
  const columns = [...weeks].reverse();
  const trainingDays = weeks.reduce((sum, w) => sum + w.trainingDays, 0);
  const reached = goal === null ? 0 : weeks.filter((w) => w.trainingDays >= goal).length;

  return (
    <section aria-labelledby="wochen-ueberblick">
      <h2 id="wochen-ueberblick" className="text-xl font-semibold">
        Letzte {weeks.length} Wochen
      </h2>
      <div
        role="img"
        aria-label={`${trainingDays} Trainingstage in ${weeks.length} Wochen`}
        className="mt-3 flex gap-2"
      >
        <div className="text-muted-foreground grid grid-rows-7 gap-1 text-xs leading-4" aria-hidden>
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} className="h-4">
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-1">
          {columns.flatMap((week) =>
            daysOfWeek(week.weekStart).map((day) => {
              const minutes = minutesByDay[day] ?? 0;
              const future = day > today;
              return (
                <span
                  key={day}
                  title={future ? undefined : `${dayLabel.format(new Date(`${day}T12:00:00Z`))}: ${minutes > 0 ? `${minutes} min` : "kein Training"}`}
                  className={cn("size-4 rounded-[3px]", future ? "bg-transparent" : HEAT_CLASS[heatLevel(minutes)])}
                />
              );
            }),
          )}
        </div>
      </div>
      <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs" aria-hidden>
        <span className="mr-1">KW {isoWeekOf(columns[0]?.weekStart ?? today)}</span>
        <span className="flex-1" />
        <span className="mr-1">weniger</span>
        {HEAT_CLASS.map((c) => (
          <span key={c} className={cn("size-3 rounded-[2px]", c)} />
        ))}
        <span className="ml-1">mehr</span>
      </div>
      {goal !== null && (
        <p className="mt-3 text-sm">
          Wochenziel in <span className="num font-semibold">{reached}</span> von {weeks.length} Wochen erreicht.
        </p>
      )}
    </section>
  );
}

/** Neue Bestwerte der Woche: einmalig in Moos hell hinterlegt und mit dem Wort „Bestwert“. */
export function WeekBests({
  bests,
}: {
  bests: readonly { exerciseId: string; exercise: string; e1rm: number; previous: number }[];
}) {
  if (bests.length === 0) return null;
  return (
    <section aria-labelledby="bestwerte-woche">
      <h2 id="bestwerte-woche" className="text-xl font-semibold">
        Neue Bestwerte
      </h2>
      <ul className="mt-2">
        {bests.map((b) => (
          <li key={b.exerciseId} className="flex min-h-14 items-center gap-4 border-b py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate">{b.exercise}</span>
              <span className="text-muted-foreground block text-sm">vorher {formatWeight(b.previous)}{" "}kg</span>
            </span>
            <span className="bg-brand-subtle rounded-lg px-2 py-1 text-right">
              <span className="num-display text-2xl">{formatWeight(b.e1rm)}</span>
              <span className="text-muted-foreground text-sm">{" "}kg</span>
              <span className="block text-xs font-medium">Bestwert</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-2 text-sm">Geschätztes Maximum für eine Wiederholung, seit Montag.</p>
    </section>
  );
}
