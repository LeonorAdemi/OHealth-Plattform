import Link from "next/link";

import type { Catalog, Goal, GoalLevel } from "../catalog";
import { describePath, goalPath, type SportLookup } from "../logic";
import { ParamChips } from "./param-chips";
import { PlanRow, UnitRow } from "./plan-rows";

/**
 * „Was hast du vor?“ auf Entdecken: Ziel wählen, sagen, wo man heute steht, und den Weg dorthin
 * sehen. Der Weg sind die Pläne nacheinander mit Dauer und Zwischenzielen, darunter einzelne
 * Einheiten zum Ziel. Ziel und Stand stehen in der Adresse (?ziel=, ?stand=).
 */
export function GoalFinder({
  catalog,
  goal,
  level,
  sports,
}: {
  catalog: Catalog;
  goal: Goal | null;
  level: GoalLevel | null;
  sports: SportLookup;
}) {
  const units = goal ? goal.units.flatMap((slug) => catalog.units.filter((u) => u.slug === slug)) : [];
  const next = level?.next ? catalog.goals.find((g) => g.id === level.next) : undefined;

  return (
    <section aria-labelledby="ziel">
      <h2 id="ziel" className="text-xl font-semibold">
        Was hast du vor?
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">Wähl ein Ziel. Du siehst den Weg dorthin, Woche für Woche.</p>
      <div className="mt-3">
        <ParamChips
          label="Ziel wählen"
          param="ziel"
          clear={["stand"]}
          options={catalog.goals.map((g) => ({ id: g.id, label: g.label }))}
          value={goal?.id ?? null}
        />
      </div>

      {goal && goal.levels.length > 1 && (
        <div className="mt-6">
          <h3 className="font-medium">Wo stehst du heute?</h3>
          <div className="mt-2">
            <ParamChips
              label="Wo stehst du heute?"
              param="stand"
              options={goal.levels.map((l) => ({ id: l.id, label: l.label }))}
              value={level?.id ?? null}
            />
          </div>
        </div>
      )}

      {goal && level && level.path.length === 0 && (
        <p className="mt-6">
          {level.note}{" "}
          {next && (
            <Link href={`/entdecken?ziel=${next.id}`} scroll={false} className="underline underline-offset-4">
              Nächstes Ziel: {next.label}
            </Link>
          )}
        </p>
      )}

      {goal && level && level.path.length > 0 && <Path catalog={catalog} level={level} sports={sports} />}

      {units.length > 0 && (
        <div className="mt-8">
          <h3 className="font-medium">Einzelne Einheiten dazu</h3>
          <ul className="mt-1" aria-label="Einzelne Einheiten">
            {units.map((u) => (
              <UnitRow key={u.slug} unit={u} sports={sports} />
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6">
        <Link href="/entdecken/plaene" className="inline-flex min-h-11 items-center underline underline-offset-4">
          Alle Pläne und Einheiten
        </Link>
      </p>
    </section>
  );
}

function Path({ catalog, level, sports }: { catalog: Catalog; level: GoalLevel; sports: SportLookup }) {
  const path = goalPath(catalog, level);
  return (
    <div className="mt-8">
      <h3 className="font-medium">Dein Weg</h3>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-zahl num-display">{path.weeks}</span>
        <span className="text-muted-foreground">Wochen</span>
      </p>
      <p className="text-muted-foreground mt-1 text-sm">{describePath(path)}</p>
      <ol className="mt-2" aria-label="Pläne in dieser Reihenfolge">
        {path.plans.map((p) => (
          <PlanRow key={p.slug} plan={p} units={catalog.units} sports={sports} />
        ))}
      </ol>
      {path.milestones.length > 0 && (
        <>
          <h4 className="mt-6 font-medium">Zwischenziele</h4>
          <ul className="mt-1">
            {path.milestones.map((m) => (
              <li
                key={`${m.week}-${m.text}`}
                className="grid min-h-14 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-4 border-b py-3"
              >
                <span className="text-muted-foreground num text-sm">Woche {m.week}</span>
                <span>{m.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
