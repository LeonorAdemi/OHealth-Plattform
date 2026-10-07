import type { Metadata } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { getSports } from "@/modules/core/queries";
import { ActiveFilters, CatalogFilterList } from "@/modules/plans/components/catalog-filters";
import { CatalogSearch } from "@/modules/plans/components/catalog-search";
import { FilterSheet } from "@/modules/plans/components/filter-sheet";
import { PlanRow, UnitRow } from "@/modules/plans/components/plan-rows";
import { SortSelect } from "@/modules/plans/components/sort-select";
import {
  activeFilterCount,
  browseCatalog,
  catalogHref,
  countLabel,
  EMPTY_QUERY,
  PAGE_SIZE,
  parseCatalogQuery,
  searchWords,
  SORT_LABEL,
  sportLookup,
  type CatalogSort,
} from "@/modules/plans/logic";
import { getCatalog } from "@/modules/plans/queries";

export const metadata: Metadata = { title: "Pläne und Einheiten" };

// Alle Pläne und Einheiten: Suche mit Vorschlägen, Filter mit Trefferzahlen, direkt alle Pläne und
// Einheiten als Liste. Alles steht in der Adresse und wird auf dem Server gerechnet
// (docs/bereiche/plaene.md).
export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const catalog = getCatalog();
  const [params, allSports] = await Promise.all([searchParams, getSports()]);
  const sports = sportLookup(allSports);
  const query = parseCatalogQuery(params, catalog);
  // Was eine neue Suche mitnimmt: die gewählten Filter und die Reihenfolge, nicht die Anzahl
  const keep = [...new URLSearchParams(catalogHref(query, { q: "" }).split("?")[1] ?? "")] as [string, string][];

  return (
    <>
      <p className="text-sm">
        <Link
          href="/entdecken"
          className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Entdecken
        </Link>
      </p>
      <h1 className="text-titel mt-2 font-semibold">Pläne und Einheiten</h1>
      <p className="text-muted-foreground mt-1 max-w-2xl">
        Pläne führen Woche für Woche zu einem Ziel. Einheiten sind einzelne Trainings zum Nachmachen.
      </p>

      {catalog.plans.length + catalog.units.length === 0 ? (
        <p className="text-muted-foreground mt-8 max-w-2xl">
          Hier erscheinen Pläne und Einheiten, sobald ihre Quellen geprüft sind.
        </p>
      ) : (
        <>
          <div className="mt-6">
            <CatalogSearch key={query.q} query={query.q} keep={keep} />
          </div>
          <Results query={query} catalog={catalog} sports={sports} />
        </>
      )}
    </>
  );
}

function Results({
  query,
  catalog,
  sports,
}: {
  query: ReturnType<typeof parseCatalogQuery>;
  catalog: ReturnType<typeof getCatalog>;
  sports: ReturnType<typeof sportLookup>;
}) {
  const result = browseCatalog(catalog, query, sports);
  const { plans, units } = result.shown;
  const total = result.plans.length + result.units.length;
  const count = countLabel(result.plans.length, result.units.length);
  const words = searchWords(query.q);
  const active = activeFilterCount(query);
  const resetHref = active > 0 ? catalogHref({ ...EMPTY_QUERY, q: query.q, sort: query.sort }) : null;
  const sorts: CatalogSort[] = ["passend", "kurz", "lang"];
  const filters = <CatalogFilterList query={query} facets={result.facets} sports={sports} />;

  return (
    <div className="mt-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
      <aside aria-label="Filter" className="hidden lg:block">
        <div className="flex min-h-9 items-center justify-between">
          <h2 className="text-sm font-semibold">Filter</h2>
          {resetHref && (
            <Link href={resetHref} replace scroll={false} className="text-sm underline underline-offset-4">
              Zurücksetzen
            </Link>
          )}
        </div>
        <div className="mt-3 border-t pt-4">{filters}</div>
      </aside>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSheet active={active} result={total > 0 ? `${count} anzeigen` : "Schließen"} resetHref={resetHref}>
            {filters}
          </FilterSheet>
          <ActiveFilters query={query} facets={result.facets} sports={sports} />
        </div>

        {total === 0 ? (
          <p className="text-muted-foreground mt-8 max-w-2xl" role="status">
            {query.q
              ? `Nichts gefunden für „${query.q}“. Versuch es mit einer Sportart, einem Ziel oder einer Übung.`
              : "Für diese Auswahl gibt es noch nichts."}{" "}
            <Link href={query.q ? catalogHref(query, { q: "" }) : catalogHref(EMPTY_QUERY)} className="text-foreground underline underline-offset-4">
              {query.q ? "Suche zurücksetzen" : "Filter zurücksetzen"}
            </Link>
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4">
              <p className="text-muted-foreground text-sm" role="status">
                {query.q ? `${count} für „${query.q}“` : count}
              </p>
              <SortSelect
                value={query.sort}
                options={sorts.map((s) => ({
                  value: s,
                  label: s === "passend" && !query.q ? "Empfohlen" : SORT_LABEL[s],
                  href: catalogHref(query, { sort: s }),
                }))}
              />
            </div>
            {plans.length > 0 && (
              <section aria-labelledby="plaene" className="mt-4">
                <h2 id="plaene" className="text-xl font-semibold">
                  Pläne
                </h2>
                <ul className="mt-2">
                  {plans.map((p) => (
                    <PlanRow key={p.slug} plan={p} units={catalog.units} sports={sports} words={words} />
                  ))}
                </ul>
              </section>
            )}
            {units.length > 0 && (
              <section aria-labelledby="einheiten" className={cn(plans.length > 0 ? "mt-10" : "mt-4")}>
                <h2 id="einheiten" className="text-xl font-semibold">
                  Einheiten
                </h2>
                <ul className="mt-2">
                  {units.map((u) => (
                    <UnitRow key={u.slug} unit={u} sports={sports} words={words} />
                  ))}
                </ul>
              </section>
            )}
            {total > query.shown && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <p className="text-muted-foreground num text-sm">
                  1–{query.shown} von {total}
                </p>
                <Link
                  href={catalogHref(query, { shown: query.shown + PAGE_SIZE })}
                  replace
                  scroll={false}
                  className="border-input hover:bg-accent inline-flex h-12 items-center justify-center rounded-lg border px-4 font-medium transition-colors duration-150 ease-out md:h-10"
                >
                  Weitere {Math.min(PAGE_SIZE, total - query.shown)} laden
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
