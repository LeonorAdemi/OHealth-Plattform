import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { SportDot } from "@/modules/core/components/sport-dot";

import { catalogHref, countLabel, EMPTY_QUERY, type CatalogIndex, type SportLookup } from "../logic";
import { SportDots } from "./plan-rows";

const ROW =
  "hover:bg-accent -mx-2 flex min-h-14 items-center gap-4 rounded-lg px-2 py-3 transition-colors duration-150 ease-out";

function IndexRow({ href, title, detail, dots }: { href: string; title: string; detail: string; dots: React.ReactNode }) {
  return (
    <li className="border-b">
      <Link href={href} className={ROW}>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-medium break-words">
            {dots}
            {title}
          </span>
          <span className="text-muted-foreground block text-sm">{detail}</span>
        </span>
        <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground shrink-0" aria-hidden />
      </Link>
    </li>
  );
}

/**
 * Einstieg in „Pläne und Einheiten“, solange nichts gesucht und gefiltert ist: je Ziel und je
 * Sportart eine Zeile mit der Zahl der Pläne und Einheiten, dahinter die gefilterte Liste.
 */
export function CatalogIndexView({ index, sports }: { index: CatalogIndex; sports: SportLookup }) {
  return (
    <div className="mt-8 xl:grid xl:grid-cols-2 xl:gap-12">
      <section aria-labelledby="nach-ziel" className="min-w-0">
        <h2 id="nach-ziel" className="text-xl font-semibold">
          Nach Ziel
        </h2>
        <ul className="mt-2">
          {index.goals.map((g) => (
            <IndexRow
              key={g.id}
              href={catalogHref(EMPTY_QUERY, { goalId: g.id })}
              title={g.label}
              detail={countLabel(g.plans, g.units)}
              dots={<SportDots ids={g.sportIds} sports={sports} />}
            />
          ))}
        </ul>
      </section>
      <div className="mt-10 min-w-0 space-y-10 xl:mt-0">
        <section aria-labelledby="nach-sportart">
          <h2 id="nach-sportart" className="text-xl font-semibold">
            Nach Sportart
          </h2>
          <ul className="mt-2">
            {index.sports.map((s) => (
              <IndexRow
                key={s.id}
                href={catalogHref(EMPTY_QUERY, { sportId: s.id })}
                title={sports.get(s.id)?.name ?? s.id}
                detail={countLabel(s.plans, s.units)}
                dots={<SportDot category={sports.get(s.id)?.category} />}
              />
            ))}
          </ul>
        </section>
        <section aria-labelledby="alles">
          <h2 id="alles" className="text-xl font-semibold">
            Alles
          </h2>
          <ul className="mt-2">
            {index.plans > 0 && (
              <IndexRow
                href={catalogHref(EMPTY_QUERY, { kind: "plaene" })}
                title="Alle Pläne"
                detail={countLabel(index.plans, 0)}
                dots={null}
              />
            )}
            {index.units > 0 && (
              <IndexRow
                href={catalogHref(EMPTY_QUERY, { kind: "einheiten" })}
                title="Alle Einheiten"
                detail={countLabel(0, index.units)}
                dots={null}
              />
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
