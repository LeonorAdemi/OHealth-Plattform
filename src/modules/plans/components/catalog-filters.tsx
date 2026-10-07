import { Check, X } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { SportDot } from "@/modules/core/components/sport-dot";

import { catalogHref, type CatalogFacets, type CatalogQuery, type FacetOption, type SportLookup } from "../logic";

/** Wie viele Optionen eines Filters sichtbar sind, der Rest liegt hinter „n weitere“. */
const VISIBLE = 6;

type Change = (id: string | null) => Partial<CatalogQuery>;

function FacetLink({
  option,
  selected,
  href,
  dot,
}: {
  option: FacetOption;
  selected: boolean;
  href: string;
  dot?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        replace
        scroll={false}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "hover:bg-accent -mx-2 flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm transition-colors duration-150 ease-out md:min-h-9",
          selected ? "text-foreground font-medium" : "text-foreground",
        )}
      >
        <span className="flex w-4 shrink-0 justify-center">
          {selected && <Check size={16} strokeWidth={1.5} aria-hidden />}
        </span>
        {dot}
        <span className="min-w-0 flex-1 break-words">{option.label}</span>
        <span className="text-muted-foreground num font-normal">
          <span className="sr-only">, </span>
          {option.count}
          <span className="sr-only"> Treffer</span>
        </span>
      </Link>
    </li>
  );
}

function Facet({
  title,
  options,
  value,
  change,
  query,
  dot,
}: {
  title: string;
  options: readonly FacetOption[];
  value: string | null;
  change: Change;
  query: CatalogQuery;
  dot?: (id: string) => React.ReactNode;
}) {
  // Optionen ohne Treffer fallen weg, die gewählte bleibt immer sichtbar
  const visible = options.filter((o) => o.count > 0 || o.id === value);
  if (visible.length === 0) return null;
  const link = (o: FacetOption) => (
    <FacetLink
      key={o.id}
      option={o}
      selected={o.id === value}
      href={catalogHref(query, change(o.id === value ? null : o.id))}
      dot={dot?.(o.id)}
    />
  );
  const head = visible.slice(0, VISIBLE);
  const rest = visible.slice(VISIBLE);
  return (
    <section className="border-b py-4 first:pt-0 last:border-b-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2">{head.map(link)}</ul>
      {rest.length > 0 && (
        <details className="group">
          <summary className="text-foreground inline-flex min-h-11 cursor-pointer list-none items-center text-sm underline underline-offset-4 md:min-h-9 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">{rest.length} weitere</span>
            <span className="hidden group-open:inline">Weniger</span>
          </summary>
          <ul>{rest.map(link)}</ul>
        </details>
      )}
    </section>
  );
}

/**
 * Alle Filter mit Trefferzahl je Option: Art, Sportart, Ziel, mit gewählter Art die Dauer und bei
 * Einheiten die Intensität. Jede Option ist ein Link in der Adresse, ein zweiter Tipp hebt sie auf.
 */
export function CatalogFilterList({
  query,
  facets,
  sports,
}: {
  query: CatalogQuery;
  facets: CatalogFacets;
  sports: SportLookup;
}) {
  return (
    <div>
      <Facet
        title="Art"
        options={facets.kind}
        value={query.kind}
        query={query}
        change={(id) => ({ kind: id as CatalogQuery["kind"] })}
      />
      <Facet
        title="Sportart"
        options={facets.sport}
        value={query.sportId}
        query={query}
        change={(id) => ({ sportId: id })}
        dot={(id) => <SportDot category={sports.get(id)?.category} />}
      />
      <Facet title="Ziel" options={facets.goal} value={query.goalId} query={query} change={(id) => ({ goalId: id })} />
      {facets.duration && (
        <Facet
          title="Dauer"
          options={facets.duration}
          value={query.duration}
          query={query}
          change={(id) => ({ duration: id })}
        />
      )}
      {facets.intensity && (
        <Facet
          title="Intensität"
          options={facets.intensity}
          value={query.intensity}
          query={query}
          change={(id) => ({ intensity: id as CatalogQuery["intensity"] })}
        />
      )}
    </div>
  );
}

/** Gewählte Filter als Chips über der Liste, jeder mit × zum Lösen. */
export function ActiveFilters({
  query,
  facets,
  sports,
}: {
  query: CatalogQuery;
  facets: CatalogFacets;
  sports: SportLookup;
}) {
  const label = (options: readonly FacetOption[] | null, id: string) => options?.find((o) => o.id === id)?.label ?? id;
  const chips = [
    query.kind && { key: "kind", label: label(facets.kind, query.kind), change: { kind: null } },
    query.sportId && {
      key: "sport",
      label: label(facets.sport, query.sportId),
      dot: <SportDot category={sports.get(query.sportId)?.category} />,
      change: { sportId: null },
    },
    query.goalId && { key: "goal", label: label(facets.goal, query.goalId), change: { goalId: null } },
    query.duration && { key: "duration", label: label(facets.duration, query.duration), change: { duration: null } },
    query.intensity && {
      key: "intensity",
      label: label(facets.intensity, query.intensity),
      change: { intensity: null },
    },
  ].filter((c) => !!c) as { key: string; label: string; dot?: React.ReactNode; change: Partial<CatalogQuery> }[];
  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Gewählte Filter">
      {chips.map((c) => (
        <li key={c.key}>
          <Link
            href={catalogHref(query, c.change)}
            replace
            scroll={false}
            aria-label={`Filter „${c.label}“ entfernen`}
            className="border-foreground text-foreground hover:bg-accent inline-flex min-h-11 items-center gap-1.5 rounded-lg border pr-2 pl-3 text-sm font-medium transition-colors duration-150 ease-out md:min-h-9"
          >
            {c.dot}
            {c.label}
            <X size={16} strokeWidth={1.5} aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
