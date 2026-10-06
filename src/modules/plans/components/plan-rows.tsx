import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { SportDot } from "@/modules/core/components/sport-dot";

import type { Plan, Unit } from "../catalog";
import { describePerWeek, INTENSITY_LABEL, planSportIds, type SportLookup } from "../logic";

export function sportNames(ids: readonly string[], sports: SportLookup): string {
  return ids.map((id) => sports.get(id)?.name ?? id).join(" und ");
}

export function SportDots({ ids, sports }: { ids: readonly string[]; sports: SportLookup }) {
  return (
    <span className="inline-flex shrink-0 gap-1">
      {ids.map((id) => (
        <SportDot key={id} category={sports.get(id)?.category} />
      ))}
    </span>
  );
}

/** Zahlenblock links in der Zeile, gebaut wie das Datum eines Trainings: Wochen, Minuten oder Wochentag. */
function NumberBlock({ value, unit }: { value: string | number; unit?: string }) {
  return (
    <span className="flex w-10 shrink-0 flex-col items-center leading-none" aria-hidden>
      <span className="num-display text-2xl">{value}</span>
      {unit && <span className="text-muted-foreground mt-1 text-xs font-medium">{unit}</span>}
    </span>
  );
}

const ROW =
  "hover:bg-accent -mx-2 flex min-h-16 items-center gap-4 rounded-lg px-2 py-3 transition-colors duration-150 ease-out";

/** Ein Plan als Zeile: Wochen, Name mit Sportfarben, darunter Sportarten, Einheiten pro Woche und Niveau. */
export function PlanRow({ plan, units, sports }: { plan: Plan; units: readonly Unit[]; sports: SportLookup }) {
  const ids = planSportIds(plan, units);
  return (
    <li className="border-b">
      <Link href={`/entdecken/plaene/${plan.slug}`} className={ROW}>
        <NumberBlock value={plan.weeks} unit="Wo." />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-medium break-words">
            <SportDots ids={ids} sports={sports} />
            {plan.title}
          </span>
          <span className="text-muted-foreground block text-sm">
            <span className="sr-only">{plan.weeks} Wochen · </span>
            {sportNames(ids, sports)} · {describePerWeek(plan)}
          </span>
          <span className="text-muted-foreground block text-sm">{plan.level}</span>
        </span>
        <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground shrink-0" aria-hidden />
      </Link>
    </li>
  );
}

/**
 * Eine Einheit als Zeile: Minuten, Name mit Sportfarbe, darunter Sportart und wie anstrengend.
 * Mit day steht links der Wochentag statt der Minuten (Woche eines Plans).
 */
export function UnitRow({ unit, sports, day }: { unit: Unit; sports: SportLookup; day?: string }) {
  const sport = sports.get(unit.sportId);
  return (
    <li className="border-b">
      <Link href={`/entdecken/einheiten/${unit.slug}`} className={ROW}>
        {day ? <NumberBlock value={day} /> : <NumberBlock value={unit.minutes} unit="min" />}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-medium break-words">
            <SportDot category={sport?.category} />
            {unit.title}
          </span>
          <span className="text-muted-foreground block text-sm">
            <span className="sr-only">{day ? `${day}: ` : `${unit.minutes} min · `}</span>
            {[sport?.name ?? unit.sportId, day ? `${unit.minutes} min` : null, INTENSITY_LABEL[unit.intensity]]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground shrink-0" aria-hidden />
      </Link>
    </li>
  );
}
