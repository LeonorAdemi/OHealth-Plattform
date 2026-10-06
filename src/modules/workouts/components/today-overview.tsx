import { cn } from "@/lib/utils";

import {
  describeDays,
  formatDistance,
  formatNumber,
  formatWeight,
  goalStreak,
  isoWeekOf,
  type WeekSummary,
} from "../logic";
import { WeekGrid } from "./week-grid";

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

/**
 * Die letzten Wochen als Wochenraster untereinander, die laufende oben. Rechts die Trainingstage, mit
 * Ziel als „3 von 4“; Wochen mit erreichtem Ziel stehen halbfett in Eisen, die anderen in Stein.
 */
export function WeeksOverview({
  weeks,
  grids,
  goal,
}: {
  weeks: readonly WeekSummary[];
  grids: readonly (readonly boolean[])[];
  goal: number | null;
}) {
  return (
    <section aria-labelledby="wochen-ueberblick">
      <h2 id="wochen-ueberblick" className="text-xl font-semibold">
        Letzte {weeks.length} Wochen
      </h2>
      <ol className="mt-3 space-y-1">
        {weeks.map((week, i) => {
          const reached = goal !== null && week.trainingDays >= goal;
          return (
            <li key={week.weekStart} className="flex h-7 items-center gap-4">
              <span className="text-muted-foreground num w-14 shrink-0 text-sm">KW {isoWeekOf(week.weekStart)}</span>
              <WeekGrid days={grids[i] ?? []} decorative />
              <span
                className={cn(
                  "num ml-auto text-sm",
                  goal === null ? "text-muted-foreground" : reached ? "font-semibold" : "text-muted-foreground",
                )}
              >
                {goal === null ? describeDays(week.trainingDays) : `${week.trainingDays} von ${goal}`}
                {reached && <span className="sr-only"> (Wochenziel erreicht)</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {goal !== null && (
        <p className="text-muted-foreground mt-3 text-sm">Halbfett: Wochenziel erreicht.</p>
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
