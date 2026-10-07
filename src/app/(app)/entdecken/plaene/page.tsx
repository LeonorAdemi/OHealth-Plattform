import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getSports } from "@/modules/core/queries";
import { ParamChips } from "@/modules/plans/components/param-chips";
import { PlanRow, UnitRow } from "@/modules/plans/components/plan-rows";
import {
  catalogSportIds,
  filterCatalog,
  MAX_QUERY,
  searchCatalog,
  sportLookup,
  toCatalogKind,
} from "@/modules/plans/logic";
import { getCatalog } from "@/modules/plans/queries";

export const metadata: Metadata = { title: "Pläne und Einheiten" };

const KINDS = [
  { id: "plaene", label: "Pläne" },
  { id: "einheiten", label: "Einheiten" },
] as const;

// Alle Pläne und Einheiten mit Suche (?q=), gefiltert nach Art (?art=) und Sportart (?sport=).
// Gesucht wird auf dem Server im Katalog, das Formular braucht kein JavaScript (docs/bereiche/plaene.md).
export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ art?: string; sport?: string; q?: string }>;
}) {
  const { art, sport, q } = await searchParams;
  const query = (q ?? "").trim().slice(0, MAX_QUERY);
  const catalog = getCatalog();
  const sports = sportLookup(await getSports());
  const sportIds = catalogSportIds(catalog);
  const kind = toCatalogKind(art);
  const sportId = sport && sportIds.includes(sport) ? sport : null;
  const { plans, units } = searchCatalog(catalog, filterCatalog(catalog, { kind, sportId }), query, sports);
  const both = plans.length > 0 && units.length > 0;
  const count = [
    plans.length > 0 && `${plans.length} ${plans.length === 1 ? "Plan" : "Pläne"}`,
    units.length > 0 && `${units.length} ${units.length === 1 ? "Einheit" : "Einheiten"}`,
  ]
    .filter(Boolean)
    .join(" · ");

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
          <form action="/entdecken/plaene" method="get" className="mt-6 max-w-2xl space-y-2" role="search">
            {kind && <input type="hidden" name="art" value={kind} />}
            {sportId && <input type="hidden" name="sport" value={sportId} />}
            <Label htmlFor="q">Pläne und Einheiten suchen</Label>
            <div className="flex gap-3">
              <Input
                id="q"
                name="q"
                type="search"
                defaultValue={query}
                maxLength={MAX_QUERY}
                placeholder="z. B. 10 km, Langer Lauf, Kniebeuge"
                enterKeyHint="search"
              />
              <Button type="submit" variant="outline">
                Suchen
              </Button>
            </div>
          </form>

          <div className="mt-4 max-w-2xl space-y-3">
            <ParamChips label="Art" param="art" allLabel="Alle" options={KINDS} value={kind} />
            {sportIds.length > 1 && (
              <ParamChips
                label="Nach Sportart filtern"
                param="sport"
                allLabel="Alle"
                options={sportIds.map((id) => ({ id, label: sports.get(id)?.name ?? id }))}
                value={sportId}
              />
            )}
          </div>

          {count === "" ? (
            <p className="text-muted-foreground mt-8 max-w-2xl" role="status">
              {query
                ? `Nichts gefunden für „${query}“. Versuch es mit einer Sportart, einem Ziel oder einer Übung.`
                : "Für diese Auswahl gibt es noch nichts."}{" "}
              <Link href="/entdecken/plaene" className="text-foreground underline underline-offset-4">
                {query ? "Suche zurücksetzen" : "Alle anzeigen"}
              </Link>
            </p>
          ) : (
            <>
              <p className="text-muted-foreground mt-8 text-sm" role="status">
                {query ? `${count} für „${query}“` : count}
              </p>
              {/* Ab 1280 px stehen Pläne und Einheiten nebeneinander */}
              <div className={cn("mt-4", both ? "xl:grid xl:grid-cols-2 xl:gap-12" : "max-w-2xl")}>
                {plans.length > 0 && (
                  <section aria-labelledby="plaene" className="min-w-0">
                    <h2 id="plaene" className="text-xl font-semibold">
                      Pläne
                    </h2>
                    <ul className="mt-2">
                      {plans.map((p) => (
                        <PlanRow key={p.slug} plan={p} units={catalog.units} sports={sports} />
                      ))}
                    </ul>
                  </section>
                )}
                {units.length > 0 && (
                  <section aria-labelledby="einheiten" className={cn("min-w-0", both && "mt-10 xl:mt-0")}>
                    <h2 id="einheiten" className="text-xl font-semibold">
                      Einheiten
                    </h2>
                    <ul className="mt-2">
                      {units.map((u) => (
                        <UnitRow key={u.slug} unit={u} sports={sports} />
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
