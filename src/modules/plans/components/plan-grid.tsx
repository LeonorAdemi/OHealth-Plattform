import { SPORT_CATEGORY_COLOR } from "@/modules/core/logic";

import type { Plan, Unit } from "../catalog";
import { describePerWeek, planSportIds, planWeeks, type SportLookup } from "../logic";

const WEEKDAY_INITIALS = ["M", "D", "M", "D", "F", "S", "S"];

/**
 * Aufbau eines Plans: je Woche eine Zeile mit sieben Quadraten wie im Wochenraster, gefüllt in der
 * Farbe der Sportart, frei in Nebel. Rechts steht der Name einer Phase in ihrer ersten Woche.
 * Darunter die Legende mit den Namen der Sportarten, denn Farbe trägt Bedeutung nie allein.
 */
export function PlanGrid({ plan, units, sports }: { plan: Plan; units: readonly Unit[]; sports: SportLookup }) {
  const sportOf = new Map(units.map((u) => [u.slug, u.sportId]));
  const ids = planSportIds(plan, units);
  const phaseStart = new Map(plan.phases.map((p) => [p.from, p.title]));

  return (
    <>
      <div
        role="img"
        aria-label={`${plan.weeks} Wochen, ${describePerWeek(plan)}`}
        className="mt-3 grid grid-cols-[1.5rem_repeat(7,0.75rem)_minmax(0,1fr)] items-center gap-1"
      >
        <span />
        {WEEKDAY_INITIALS.map((d, i) => (
          <span key={i} className="text-muted-foreground text-center text-xs leading-3 font-medium">
            {d}
          </span>
        ))}
        <span />
        {planWeeks(plan).map((days, i) => (
          <Week key={i} number={i + 1} phase={phaseStart.get(i + 1)}>
            {days.map((slug, d) => {
              const category = slug ? sports.get(sportOf.get(slug) ?? "")?.category : undefined;
              return (
                <span
                  key={d}
                  className="bg-muted size-3 rounded-[2px]"
                  style={category ? { backgroundColor: SPORT_CATEGORY_COLOR[category] } : undefined}
                />
              );
            })}
          </Week>
        ))}
      </div>
      <p className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {ids.map((id) => {
          const sport = sports.get(id);
          return (
            <span key={id} className="inline-flex items-center gap-1.5">
              <span
                className="size-3 rounded-[2px]"
                style={{
                  backgroundColor: sport ? SPORT_CATEGORY_COLOR[sport.category] : undefined,
                }}
              />
              {sport?.name ?? id}
            </span>
          );
        })}
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-muted size-3 rounded-[2px]" />
          frei
        </span>
      </p>
    </>
  );
}

function Week({ number, phase, children }: { number: number; phase?: string; children: React.ReactNode }) {
  return (
    <>
      <span className="text-muted-foreground num pr-1 text-right text-xs leading-3">{number}</span>
      {children}
      <span className="text-muted-foreground truncate pl-2 text-xs leading-3">{phase}</span>
    </>
  );
}
