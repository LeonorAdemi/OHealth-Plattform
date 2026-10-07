import { foldForSearch, type SportCategory } from "@/modules/core/logic";

import type { Catalog, Goal, GoalLevel, Intensity, Plan, Unit } from "./catalog";

/** Name, Gruppe und Suchbegriffe je Sportart aus dem Sportarten-Katalog, für Namen, Sportfarben und Suche. */
export type SportLookup = ReadonlyMap<string, { name: string; category: SportCategory; aliases: readonly string[] }>;

export function sportLookup(
  sports: readonly { id: string; name: string; category: SportCategory; aliases: readonly string[] }[],
): SportLookup {
  return new Map(sports.map((s) => [s.id, { name: s.name, category: s.category, aliases: s.aliases }]));
}

export const INTENSITY_LABEL: Record<Intensity, string> = {
  locker: "Locker",
  mittel: "Mittel",
  hart: "Hart",
};

/**
 * Was die App zeigt: in Produktion (VERCEL_ENV=production) ohne Entwürfe, lokal und in Previews alles.
 * Ziele behalten nur Ausgangsstände, deren Pläne sichtbar sind, und fallen ohne einen Weg ganz weg.
 */
export function visibleCatalog(catalog: Catalog, vercelEnv: string | undefined): Catalog {
  if (vercelEnv !== "production") return catalog;
  const plans = catalog.plans.filter((p) => !p.draft);
  const units = catalog.units.filter((u) => !u.draft);
  const planSlugs = new Set(plans.map((p) => p.slug));
  const unitSlugs = new Set(units.map((u) => u.slug));
  const goals = catalog.goals
    .map((g) => ({
      ...g,
      levels: g.levels.filter((l) => l.path.every((s) => planSlugs.has(s))),
      units: g.units.filter((s) => unitSlugs.has(s)),
    }))
    .filter((g) => g.levels.some((l) => l.path.length > 0));
  return { goals, plans, units };
}

// ---------- Ein Plan ----------

/** Alle Wochen eines Plans, je Woche Montag bis Sonntag die Einheit oder null für frei. */
export function planWeeks(plan: Plan): (string | null)[][] {
  return Array.from({ length: plan.weeks }, (_, i) => {
    const week = i + 1;
    const taper = week > plan.weeks - plan.taperWeeks;
    const lighter = taper || (plan.lighterEvery !== null && week % plan.lighterEvery === 0);
    return plan.week.map((unit, day) => (lighter && day === plan.lighterDay ? null : unit));
  });
}

export function countSessions(plan: Plan): number {
  return planWeeks(plan).reduce((sum, days) => sum + days.filter(Boolean).length, 0);
}

/** „3× pro Woche“ oder bei leichteren Wochen „3–4× pro Woche“. */
export function describePerWeek(plan: Plan): string {
  const counts = planWeeks(plan).map((days) => days.filter(Boolean).length);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  return min === max ? `${max}× pro Woche` : `${min}–${max}× pro Woche`;
}

/** Sportarten eines Plans in der Reihenfolge der Woche, jede einmal. */
export function planSportIds(plan: Plan, units: readonly Unit[]): string[] {
  const bySlug = new Map(units.map((u) => [u.slug, u.sportId]));
  const ids = plan.week.flatMap((slug) => (slug ? [bySlug.get(slug)] : [])).filter((id) => id !== undefined);
  return [...new Set(ids)];
}

/** „Woche 4“ oder „Woche 1–3“. */
export function formatWeekRange(from: number, to: number): string {
  return from === to ? `Woche ${from}` : `Woche ${from}–${to}`;
}

/** Pläne, in deren Woche die Einheit vorkommt. */
export function plansWithUnit(catalog: Catalog, unitSlug: string): Plan[] {
  return catalog.plans.filter((p) => p.week.includes(unitSlug));
}

// ---------- Weg zum Ziel ----------

export function findGoal(catalog: Catalog, goalId: string | undefined): Goal | null {
  return catalog.goals.find((g) => g.id === goalId) ?? null;
}

/** Der gewählte Ausgangsstand; hat ein Ziel nur einen, ist er ohne Frage gewählt. */
export function findLevel(goal: Goal, levelId: string | undefined): GoalLevel | null {
  if (goal.levels.length === 1) return goal.levels[0];
  return goal.levels.find((l) => l.id === levelId) ?? null;
}

export type GoalPath = {
  plans: Plan[];
  weeks: number;
  /** Zwischenziele über alle Pläne, mit fortlaufender Woche ab Beginn des ersten Plans */
  milestones: { week: number; text: string; plan: string }[];
};

/** Die Pläne vom Ausgangsstand zum Ziel nacheinander, mit Dauer und Zwischenzielen. */
export function goalPath(catalog: Catalog, level: GoalLevel): GoalPath {
  const plans = level.path.map((slug) => catalog.plans.find((p) => p.slug === slug)).filter((p) => p !== undefined);
  let offset = 0;
  const milestones = plans.flatMap((p) => {
    const rows = p.milestones.map((m) => ({
      week: offset + m.week,
      text: m.text,
      plan: p.title,
    }));
    offset += p.weeks;
    return rows;
  });
  return { plans, weeks: offset, milestones };
}

/** Satz unter der Dauer des Wegs: „3× pro Woche, 24 Einheiten“ oder „2 Pläne nacheinander, 54 Einheiten“. */
export function describePath(path: GoalPath): string {
  const sessions = path.plans.reduce((sum, p) => sum + countSessions(p), 0);
  const first = path.plans.length === 1 ? describePerWeek(path.plans[0]) : `${path.plans.length} Pläne nacheinander`;
  return `${first}, ${sessions} Einheiten`;
}

// ---------- Alle Pläne und Einheiten ----------

export type CatalogKind = "plaene" | "einheiten";

export function toCatalogKind(value: string | undefined): CatalogKind | null {
  return value === "plaene" || value === "einheiten" ? value : null;
}

/** Sportarten, die im Katalog vorkommen, in der Reihenfolge des ersten Auftretens. */
export function catalogSportIds(catalog: Catalog): string[] {
  return [
    ...new Set([
      ...catalog.plans.flatMap((p) => planSportIds(p, catalog.units)),
      ...catalog.units.map((u) => u.sportId),
    ]),
  ];
}

export function filterCatalog(
  catalog: Catalog,
  filter: { kind: CatalogKind | null; sportId: string | null },
): { plans: Plan[]; units: Unit[] } {
  const { kind, sportId } = filter;
  return {
    plans:
      kind === "einheiten"
        ? []
        : catalog.plans.filter((p) => !sportId || planSportIds(p, catalog.units).includes(sportId)),
    units: kind === "plaene" ? [] : catalog.units.filter((u) => !sportId || u.sportId === sportId),
  };
}

// ---------- Suche ----------

export const MAX_QUERY = 60;

/** Suchtext wie für den Vergleich: gefaltet, Zahl und Einheit getrennt („5km“ wird „5 km“). */
function searchText(text: string): string {
  return foldForSearch(text).replace(/(\d)(\p{L})/gu, "$1 $2");
}

/** Wörter einer Suche, höchstens acht. */
export function searchWords(query: string): string[] {
  return searchText(query.slice(0, MAX_QUERY)).split(/\s+/).filter(Boolean).slice(0, 8);
}

type Field = { text: string; weight: number };

/** Gewicht je Treffer: Titel vor Suchbegriffen, Sportart und Ziel, dann der Rest. */
function score(fields: readonly Field[], words: readonly string[]): number {
  let total = 0;
  for (const word of words) {
    const best = Math.max(0, ...fields.filter((f) => f.text.includes(word)).map((f) => f.weight));
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

function sportFields(ids: readonly string[], sports: SportLookup): Field[] {
  return ids.flatMap((id) => {
    const s = sports.get(id);
    return [id, s?.name ?? "", ...(s?.aliases ?? [])].map((t) => ({ text: searchText(t), weight: 2 }));
  });
}

const fields = (weight: number, texts: readonly string[]): Field[] =>
  texts.map((t) => ({ text: searchText(t), weight }));

/**
 * Sucht in Plänen und Einheiten: jedes Wort muss vorkommen, im Titel, in den Suchbegriffen, bei der
 * Sportart (auch ihre Suchbegriffe wie „Joggen“), beim Ziel, im Niveau oder im Ablauf. Ein Plan wird
 * auch über seine Einheiten gefunden. Treffer im Titel stehen oben, sonst bleibt die Reihenfolge.
 */
export function searchCatalog(
  catalog: Catalog,
  items: { plans: readonly Plan[]; units: readonly Unit[] },
  query: string,
  sports: SportLookup,
): { plans: Plan[]; units: Unit[] } {
  const words = searchWords(query);
  if (words.length === 0) return { plans: [...items.plans], units: [...items.units] };
  const units = new Map(catalog.units.map((u) => [u.slug, u]));
  const goalsOfPlan = (slug: string) =>
    catalog.goals.filter((g) => g.levels.some((l) => l.path.includes(slug))).map((g) => g.label);
  const goalsOfUnit = (slug: string) => catalog.goals.filter((g) => g.units.includes(slug)).map((g) => g.label);
  const unitTexts = (u: Unit) => [u.title, ...u.steps.map((s) => s.text)];

  const rank = <T>(list: readonly T[], fieldsOf: (item: T) => Field[]) =>
    list
      .map((item) => ({ item, score: score(fieldsOf(item), words) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);

  return {
    plans: rank(items.plans, (p) => [
      ...fields(3, [p.title]),
      ...fields(2, [...(p.keywords ?? []), ...goalsOfPlan(p.slug)]),
      ...sportFields(planSportIds(p, catalog.units), sports),
      ...fields(1, [
        p.level,
        ...p.week.flatMap((slug) => (slug && units.has(slug) ? unitTexts(units.get(slug)!) : [])),
      ]),
    ]),
    units: rank(items.units, (u) => [
      ...fields(3, [u.title]),
      ...fields(2, [...(u.keywords ?? []), ...goalsOfUnit(u.slug)]),
      ...sportFields([u.sportId], sports),
      ...fields(1, [INTENSITY_LABEL[u.intensity], ...u.steps.map((s) => s.text)]),
    ]),
  };
}

// ---------- Eine Einheit ----------

/**
 * Was man bei dieser Sportart einträgt, aus den Angaben im Sportarten-Katalog: mit Sätzen wie im
 * Kraft-Modus, sonst wie bei „Aktivität eintragen“ (docs/bereiche/aktivitaeten.md).
 */
export function trackedFields(sport: { hasDistance: boolean; hasElevation: boolean; hasSets: boolean }): string[] {
  if (sport.hasSets) return ["Übungen mit Sätzen, je Satz Gewicht und Wiederholungen", "Dauer von Beginn bis Ende"];
  return [
    "Dauer",
    ...(sport.hasDistance ? ["Distanz in km"] : []),
    ...(sport.hasElevation ? ["Höhenmeter"] : []),
    "Wie anstrengend",
  ];
}

// ---------- Suchen und Filtern ----------
// „Alle Pläne und Einheiten“: Filter mit Trefferzahlen, Startansicht nach Ziel und Sportart,
// Vorschläge beim Tippen (docs/bereiche/plaene.md).

export const CATALOG_PATH = "/entdecken/plaene";
export const PAGE_SIZE = 20;
const MAX_SHOWN = 500;

export type CatalogSort = "passend" | "kurz" | "lang";

export const SORT_LABEL: Record<CatalogSort, string> = {
  passend: "Passend zuerst",
  kurz: "Kürzeste zuerst",
  lang: "Längste zuerst",
};

type Range = { id: string; label: string; min: number; max: number };

/** Dauer eines Plans in Wochen, als Filter bei „Pläne“. */
export const PLAN_DURATIONS: readonly Range[] = [
  { id: "bis-6", label: "bis 6 Wochen", min: 0, max: 6 },
  { id: "7-12", label: "7–12 Wochen", min: 7, max: 12 },
  { id: "ab-13", label: "ab 13 Wochen", min: 13, max: Infinity },
];

/** Dauer einer Einheit in Minuten, als Filter bei „Einheiten“. */
export const UNIT_DURATIONS: readonly Range[] = [
  { id: "bis-30", label: "bis 30 min", min: 0, max: 30 },
  { id: "31-45", label: "31–45 min", min: 31, max: 45 },
  { id: "46-60", label: "46–60 min", min: 46, max: 60 },
  { id: "ueber-60", label: "über 60 min", min: 61, max: Infinity },
];

const INTENSITIES = Object.keys(INTENSITY_LABEL) as Intensity[];

/** Suche und Filter aus der Adresse, geprüft gegen den Katalog. */
export type CatalogQuery = {
  q: string;
  kind: CatalogKind | null;
  sportId: string | null;
  goalId: string | null;
  /** Dauer-Stufe, nur mit gewählter Art (Wochen bei Plänen, Minuten bei Einheiten) */
  duration: string | null;
  /** Nur bei Einheiten */
  intensity: Intensity | null;
  sort: CatalogSort;
  /** Wie viele Treffer zu sehen sind, ein Vielfaches von PAGE_SIZE */
  shown: number;
};

export const EMPTY_QUERY: CatalogQuery = {
  q: "",
  kind: null,
  sportId: null,
  goalId: null,
  duration: null,
  intensity: null,
  sort: "passend",
  shown: PAGE_SIZE,
};

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function durationsFor(kind: CatalogKind | null): readonly Range[] {
  if (kind === "plaene") return PLAN_DURATIONS;
  if (kind === "einheiten") return UNIT_DURATIONS;
  return [];
}

/**
 * Liest Suche und Filter aus der Adresse (?q, art, sport, ziel, dauer, intensitaet, sortierung, anzahl).
 * Unbekannte Werte fallen weg: Sportart und Ziel nur aus dem Katalog, Dauer nur passend zur Art,
 * Intensität nur bei Einheiten, die Anzahl als Vielfaches von 20.
 */
export function parseCatalogQuery(params: Params, catalog: Catalog): CatalogQuery {
  const kind = toCatalogKind(first(params.art));
  const sport = first(params.sport);
  const goal = first(params.ziel);
  const duration = first(params.dauer);
  const intensity = first(params.intensitaet);
  const sort = first(params.sortierung);
  const shown = Number.parseInt(first(params.anzahl) ?? "", 10);
  return {
    q: (first(params.q) ?? "").trim().slice(0, MAX_QUERY),
    kind,
    sportId: sport && catalogSportIds(catalog).includes(sport) ? sport : null,
    goalId: goal && catalog.goals.some((g) => g.id === goal) ? goal : null,
    duration: durationsFor(kind).some((d) => d.id === duration) ? duration! : null,
    intensity: kind === "einheiten" && INTENSITIES.includes(intensity as Intensity) ? (intensity as Intensity) : null,
    sort: sort === "kurz" || sort === "lang" ? sort : "passend",
    shown: Number.isFinite(shown)
      ? Math.min(MAX_SHOWN, Math.max(PAGE_SIZE, Math.ceil(shown / PAGE_SIZE) * PAGE_SIZE))
      : PAGE_SIZE,
  };
}

/**
 * Adresse mit geänderter Suche oder Filtern. Jede Änderung zeigt wieder die ersten 20 Treffer; eine
 * andere Art setzt Dauer und Intensität zurück, weil sie zur Art gehören.
 */
export function catalogHref(query: CatalogQuery, change: Partial<CatalogQuery> = {}): string {
  const next: CatalogQuery = { ...query, shown: PAGE_SIZE, ...change };
  if ("kind" in change && change.kind !== query.kind) {
    next.duration = change.duration ?? null;
    next.intensity = change.intensity ?? null;
  }
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.kind) params.set("art", next.kind);
  if (next.sportId) params.set("sport", next.sportId);
  if (next.goalId) params.set("ziel", next.goalId);
  if (next.duration) params.set("dauer", next.duration);
  if (next.intensity) params.set("intensitaet", next.intensity);
  if (next.sort !== "passend") params.set("sortierung", next.sort);
  if (next.shown !== PAGE_SIZE) params.set("anzahl", String(next.shown));
  const search = params.toString();
  return search ? `${CATALOG_PATH}?${search}` : CATALOG_PATH;
}

/** Wie viele Filter gewählt sind (ohne Suche und Reihenfolge), für den Knopf „Filter“. */
export function activeFilterCount(query: CatalogQuery): number {
  return [query.kind, query.sportId, query.goalId, query.duration, query.intensity].filter(Boolean).length;
}

/** Ohne Suche und Filter zeigt die Seite die Übersicht nach Ziel und Sportart statt einer Liste. */
export function isStartView(query: CatalogQuery): boolean {
  return query.q === "" && activeFilterCount(query) === 0;
}

/** „1 Plan · 6 Einheiten“, leer ohne Treffer. */
export function countLabel(plans: number, units: number): string {
  return [
    plans > 0 && `${plans} ${plans === 1 ? "Plan" : "Pläne"}`,
    units > 0 && `${units} ${units === 1 ? "Einheit" : "Einheiten"}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

const inRange = (ranges: readonly Range[], id: string, value: number) => {
  const r = ranges.find((d) => d.id === id);
  return r !== undefined && value >= r.min && value <= r.max;
};

type Filter = Omit<CatalogQuery, "q" | "sort" | "shown">;
type FilterKey = keyof Filter;

function planGoals(catalog: Catalog, slug: string): string[] {
  return catalog.goals.filter((g) => g.levels.some((l) => l.path.includes(slug))).map((g) => g.id);
}

function unitGoals(catalog: Catalog, slug: string): string[] {
  return catalog.goals.filter((g) => g.units.includes(slug)).map((g) => g.id);
}

/** Filtert schon gesuchte Pläne und Einheiten; except lässt einen Filter weg (für dessen Trefferzahlen). */
function applyFilter(
  catalog: Catalog,
  items: { plans: readonly Plan[]; units: readonly Unit[] },
  filter: Filter,
  except?: FilterKey,
): { plans: Plan[]; units: Unit[] } {
  const f = { ...filter, ...(except ? { [except]: null } : {}) } as Filter;
  return {
    plans:
      f.kind === "einheiten" || f.intensity
        ? []
        : items.plans.filter(
            (p) =>
              (!f.sportId || planSportIds(p, catalog.units).includes(f.sportId)) &&
              (!f.goalId || planGoals(catalog, p.slug).includes(f.goalId)) &&
              (!f.duration || inRange(PLAN_DURATIONS, f.duration, p.weeks)),
          ),
    units:
      f.kind === "plaene"
        ? []
        : items.units.filter(
            (u) =>
              (!f.sportId || u.sportId === f.sportId) &&
              (!f.goalId || unitGoals(catalog, u.slug).includes(f.goalId)) &&
              (!f.duration || inRange(UNIT_DURATIONS, f.duration, u.minutes)) &&
              (!f.intensity || u.intensity === f.intensity),
          ),
  };
}

export type FacetOption = { id: string; label: string; count: number };

export type CatalogFacets = {
  kind: FacetOption[];
  sport: FacetOption[];
  goal: FacetOption[];
  /** Nur mit gewählter Art */
  duration: FacetOption[] | null;
  /** Nur bei Einheiten */
  intensity: FacetOption[] | null;
};

export type CatalogResult = {
  /** Alle Treffer in ihrer Reihenfolge */
  plans: Plan[];
  units: Unit[];
  /** Die ersten query.shown Treffer, Pläne vor Einheiten */
  shown: { plans: Plan[]; units: Unit[] };
  facets: CatalogFacets;
};

const sortBy = <T>(list: T[], sort: CatalogSort, length: (item: T) => number) =>
  sort === "passend" ? list : [...list].sort((a, b) => (sort === "kurz" ? 1 : -1) * (length(a) - length(b)));

/**
 * Sucht und filtert den Katalog und zählt je Filter-Option, wie viele Treffer sie übrig lässt. Die
 * Zahl einer Option rechnet mit allen anderen gewählten Filtern, aber ohne den eigenen, damit man
 * innerhalb eines Filters wechseln kann, ohne in eine leere Liste zu geraten.
 */
export function browseCatalog(catalog: Catalog, query: CatalogQuery, sports: SportLookup): CatalogResult {
  const searched = searchCatalog(catalog, catalog, query.q, sports);
  const filter: Filter = {
    kind: query.kind,
    sportId: query.sportId,
    goalId: query.goalId,
    duration: query.duration,
    intensity: query.intensity,
  };
  const without = (key: FilterKey) => applyFilter(catalog, searched, filter, key);

  // Eine andere Art setzt Dauer und Intensität zurück, deshalb zählt die Art ohne beide
  const byKind = applyFilter(catalog, searched, { ...filter, kind: null, duration: null, intensity: null });
  const bySport = without("sportId");
  const byGoal = without("goalId");
  const facets: CatalogFacets = {
    kind: [
      { id: "plaene", label: "Pläne", count: byKind.plans.length },
      { id: "einheiten", label: "Einheiten", count: byKind.units.length },
    ],
    sport: catalogSportIds(catalog).map((id) => ({
      id,
      label: sports.get(id)?.name ?? id,
      count:
        bySport.plans.filter((p) => planSportIds(p, catalog.units).includes(id)).length +
        bySport.units.filter((u) => u.sportId === id).length,
    })),
    goal: catalog.goals.map((g) => ({
      id: g.id,
      label: g.label,
      count:
        byGoal.plans.filter((p) => planGoals(catalog, p.slug).includes(g.id)).length +
        byGoal.units.filter((u) => g.units.includes(u.slug)).length,
    })),
    duration: null,
    intensity: null,
  };
  if (query.kind) {
    const byDuration = without("duration");
    facets.duration = durationsFor(query.kind).map((d) => ({
      id: d.id,
      label: d.label,
      count:
        query.kind === "plaene"
          ? byDuration.plans.filter((p) => inRange(PLAN_DURATIONS, d.id, p.weeks)).length
          : byDuration.units.filter((u) => inRange(UNIT_DURATIONS, d.id, u.minutes)).length,
    }));
  }
  if (query.kind === "einheiten") {
    const byIntensity = without("intensity");
    facets.intensity = INTENSITIES.map((i) => ({
      id: i,
      label: INTENSITY_LABEL[i],
      count: byIntensity.units.filter((u) => u.intensity === i).length,
    }));
  }

  const matched = applyFilter(catalog, searched, filter);
  const plans = sortBy(matched.plans, query.sort, (p) => p.weeks);
  const units = sortBy(matched.units, query.sort, (u) => u.minutes);
  return {
    plans,
    units,
    shown: {
      plans: plans.slice(0, query.shown),
      units: units.slice(0, Math.max(0, query.shown - plans.length)),
    },
    facets,
  };
}

export type CatalogIndex = {
  goals: { id: string; label: string; plans: number; units: number; sportIds: string[] }[];
  sports: { id: string; plans: number; units: number }[];
  plans: number;
  units: number;
};

/** Übersicht für den Einstieg: je Ziel und je Sportart, wie viele Pläne und Einheiten es gibt. */
export function catalogIndex(catalog: Catalog): CatalogIndex {
  return {
    goals: catalog.goals.map((g) => {
      const plans = catalog.plans.filter((p) => planGoals(catalog, p.slug).includes(g.id));
      const units = catalog.units.filter((u) => g.units.includes(u.slug));
      return {
        id: g.id,
        label: g.label,
        plans: plans.length,
        units: units.length,
        sportIds: [...new Set([...plans.flatMap((p) => planSportIds(p, catalog.units)), ...units.map((u) => u.sportId)])],
      };
    }),
    sports: catalogSportIds(catalog).map((id) => ({
      id,
      plans: catalog.plans.filter((p) => planSportIds(p, catalog.units).includes(id)).length,
      units: catalog.units.filter((u) => u.sportId === id).length,
    })),
    plans: catalog.plans.length,
    units: catalog.units.length,
  };
}

// ---------- Vorschläge beim Tippen ----------

export const MIN_SUGGEST = 2;

export type Suggestion = {
  href: string;
  label: string;
  detail: string;
  /** Gruppen der Sportarten für die Punkte in Sportfarbe */
  categories: SportCategory[];
  /** Zahlenblock wie in den Zeilen: Wochen eines Plans, Minuten einer Einheit */
  number?: { value: number; unit: string };
};

export type SuggestionGroup = { label: string; items: Suggestion[] };

const matchesAll = (texts: readonly string[], words: readonly string[]) => {
  const folded = texts.map(searchText);
  return words.every((w) => folded.some((t) => t.includes(w)));
};

/**
 * Vorschläge zu einer Suche ab zwei Zeichen, gruppiert nach Zielen, Sportarten, Plänen und Einheiten,
 * höchstens perGroup je Gruppe. Ziele und Sportarten führen in die gefilterte Liste, Pläne und
 * Einheiten auf ihre Seite. total ist die Zahl aller Pläne und Einheiten zur Suche.
 */
export function suggestCatalog(
  catalog: Catalog,
  query: string,
  sports: SportLookup,
  perGroup = 3,
): { groups: SuggestionGroup[]; total: number } {
  const q = query.trim().slice(0, MAX_QUERY);
  const words = searchWords(q);
  if (q.length < MIN_SUGGEST || words.length === 0) return { groups: [], total: 0 };
  const index = catalogIndex(catalog);
  const nameOf = (id: string) => sports.get(id)?.name ?? id;
  const categoriesOf = (ids: readonly string[]) =>
    ids.map((id) => sports.get(id)?.category).filter((c) => c !== undefined);

  const goals = index.goals
    .filter((g) => matchesAll([g.label], words))
    .slice(0, perGroup)
    .map((g) => ({
      href: catalogHref(EMPTY_QUERY, { goalId: g.id }),
      label: g.label,
      detail: countLabel(g.plans, g.units),
      categories: categoriesOf(g.sportIds),
    }));
  const sportItems = index.sports
    .filter((s) => matchesAll([s.id, nameOf(s.id), ...(sports.get(s.id)?.aliases ?? [])], words))
    .slice(0, perGroup)
    .map((s) => ({
      href: catalogHref(EMPTY_QUERY, { sportId: s.id }),
      label: nameOf(s.id),
      detail: countLabel(s.plans, s.units),
      categories: categoriesOf([s.id]),
    }));
  const found = searchCatalog(catalog, catalog, q, sports);
  const plans = found.plans.slice(0, perGroup).map((p) => {
    const ids = planSportIds(p, catalog.units);
    return {
      href: `${CATALOG_PATH}/${p.slug}`,
      label: p.title,
      detail: `${ids.map(nameOf).join(" und ")} · ${describePerWeek(p)}`,
      categories: categoriesOf(ids),
      number: { value: p.weeks, unit: "Wo." },
    };
  });
  const units = found.units.slice(0, perGroup).map((u) => ({
    href: `/entdecken/einheiten/${u.slug}`,
    label: u.title,
    detail: `${nameOf(u.sportId)} · ${INTENSITY_LABEL[u.intensity]}`,
    categories: categoriesOf([u.sportId]),
    number: { value: u.minutes, unit: "min" },
  }));

  return {
    groups: [
      { label: "Ziele", items: goals },
      { label: "Sportarten", items: sportItems },
      { label: "Pläne", items: plans },
      { label: "Einheiten", items: units },
    ].filter((g) => g.items.length > 0),
    total: found.plans.length + found.units.length,
  };
}

// ---------- Suchwörter im Text hervorheben ----------

/** Ein Zeichen gefaltet wie foldForSearch, aber ohne trim, damit Stellen im Text erhalten bleiben. */
function foldChar(ch: string): string {
  return ch.toLocaleLowerCase("de-DE").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ß/g, "ss");
}

/**
 * Teilt einen Text in Stücke, je mit der Angabe, ob ein Suchwort darin vorkommt. Groß- und
 * Kleinschreibung und Umlaute spielen wie bei der Suche keine Rolle.
 */
export function highlight(text: string, words: readonly string[]): { text: string; match: boolean }[] {
  let folded = "";
  const start: number[] = [];
  const end: number[] = [];
  for (let i = 0; i < text.length; ) {
    const ch = String.fromCodePoint(text.codePointAt(i)!);
    for (const f of foldChar(ch)) {
      folded += f;
      start.push(i);
      end.push(i + ch.length);
    }
    i += ch.length;
  }
  const marked = new Array<boolean>(text.length).fill(false);
  for (const word of words) {
    if (!word) continue;
    for (let at = folded.indexOf(word); at !== -1; at = folded.indexOf(word, at + 1)) {
      for (let i = start[at]; i < end[at + word.length - 1]; i++) marked[i] = true;
    }
  }
  const parts: { text: string; match: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts.at(-1);
    if (last && last.match === marked[i]) last.text += text[i];
    else parts.push({ text: text[i], match: marked[i] });
  }
  return parts;
}
