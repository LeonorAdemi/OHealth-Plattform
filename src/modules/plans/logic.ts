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
