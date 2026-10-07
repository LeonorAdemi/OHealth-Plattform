import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CATALOG, type Catalog, type Plan } from "./catalog";
import {
  catalogSportIds,
  countSessions,
  describePath,
  describePerWeek,
  filterCatalog,
  findGoal,
  findLevel,
  formatWeekRange,
  goalPath,
  planSportIds,
  planWeeks,
  plansWithUnit,
  searchCatalog,
  searchWords,
  toCatalogKind,
  trackedFields,
  visibleCatalog,
} from "./logic";

const plan = (overrides: Partial<Plan>): Plan => ({
  slug: "p",
  title: "P",
  weeks: 4,
  level: "Einstieg",
  prerequisite: "",
  week: ["a", null, "b", null, null, "c", null],
  lighterDay: null,
  lighterEvery: null,
  taperWeeks: 0,
  phases: [],
  milestones: [],
  basis: "",
  sources: [],
  ...overrides,
});

const unit = (slug: string, sportId: string, draft = false) => ({
  slug,
  title: slug,
  sportId,
  minutes: 30,
  intensity: "locker" as const,
  steps: [],
  why: "",
  draft,
});

describe("Wochen eines Plans", () => {
  it("Ohne leichtere Wochen ist jede Woche die Grundwoche", () => {
    const weeks = planWeeks(plan({}));
    expect(weeks).toHaveLength(4);
    expect(weeks.every((w) => w.filter(Boolean).length === 3)).toBe(true);
    expect(countSessions(plan({}))).toBe(12);
    expect(describePerWeek(plan({}))).toBe("3× pro Woche");
  });

  it("Jede vierte Woche und die Wochen vor dem Ziel entfällt die Einheit am leichteren Tag", () => {
    const p = plan({ weeks: 8, lighterDay: 5, lighterEvery: 4, taperWeeks: 1 });
    const perWeek = planWeeks(p).map((days) => days.filter(Boolean).length);
    expect(perWeek).toEqual([3, 3, 3, 2, 3, 3, 3, 2]);
    expect(planWeeks(p)[3][5]).toBeNull();
    expect(countSessions(p)).toBe(22);
    expect(describePerWeek(p)).toBe("2–3× pro Woche");
  });

  it("Sportarten stehen in der Reihenfolge der Woche, jede einmal", () => {
    const units = [unit("a", "laufen"), unit("b", "krafttraining"), unit("c", "laufen")];
    expect(planSportIds(plan({}), units)).toEqual(["laufen", "krafttraining"]);
  });

  it("Wochenbereich: eine Woche oder von bis", () => {
    expect(formatWeekRange(8, 8)).toBe("Woche 8");
    expect(formatWeekRange(1, 3)).toBe("Woche 1–3");
  });
});

describe("Weg zum Ziel", () => {
  it("Wer noch nicht läuft, kommt über die ersten 5 km zu 10 km, die Zwischenziele laufen über beide Pläne", () => {
    const goal = findGoal(CATALOG, "10-km");
    expect(goal).not.toBeNull();
    const level = findLevel(goal!, "neu");
    const path = goalPath(CATALOG, level!);
    expect(path.plans.map((p) => p.slug)).toEqual(["erste-5-km", "10-km"]);
    expect(path.weeks).toBe(16);
    expect(path.milestones.at(-1)).toEqual({
      week: 16,
      text: "10 km",
      plan: "10 km",
    });
    expect(path.milestones.map((m) => m.week)).toEqual([...path.milestones.map((m) => m.week)].sort((a, b) => a - b));
    expect(describePath(path)).toBe(
      `2 Pläne nacheinander, ${countSessions(path.plans[0]) + countSessions(path.plans[1])} Einheiten`,
    );
  });

  it("Ein Weg aus einem Plan nennt die Einheiten pro Woche", () => {
    const path = goalPath(CATALOG, findLevel(findGoal(CATALOG, "kraft")!, undefined)!);
    expect(describePath(path)).toBe("3× pro Woche, 30 Einheiten");
  });

  it("Ohne gewählten Ausgangsstand gibt es noch keinen Weg, außer das Ziel hat nur einen", () => {
    expect(findLevel(findGoal(CATALOG, "10-km")!, undefined)).toBeNull();
    expect(findLevel(findGoal(CATALOG, "kraft")!, undefined)?.id).toBe("neu");
  });

  it("Unbekannte Ziele und Stände aus der Adresse werden ignoriert", () => {
    expect(findGoal(CATALOG, "mond")).toBeNull();
    expect(findLevel(findGoal(CATALOG, "10-km")!, "<script>")).toBeNull();
  });
});

describe("Entwürfe", () => {
  const catalog: Catalog = {
    plans: [
      plan({ slug: "fertig", week: ["a", null, null, null, null, null, null] }),
      plan({ slug: "entwurf", draft: true }),
    ],
    units: [unit("a", "laufen"), unit("b", "laufen", true)],
    goals: [
      {
        id: "z",
        label: "Z",
        levels: [
          { id: "neu", label: "Neu", path: ["entwurf", "fertig"] },
          { id: "weiter", label: "Weiter", path: ["fertig"] },
        ],
        units: ["a", "b"],
      },
      {
        id: "nur-entwurf",
        label: "Nur Entwurf",
        levels: [{ id: "neu", label: "Neu", path: ["entwurf"] }],
        units: [],
      },
    ],
  };

  it("Lokal und in Previews erscheinen auch Entwürfe", () => {
    expect(visibleCatalog(catalog, undefined)).toBe(catalog);
    expect(visibleCatalog(catalog, "preview")).toBe(catalog);
  });

  it("In Produktion fehlen Entwürfe, Wege über einen Entwurf und Ziele ohne Weg", () => {
    const shown = visibleCatalog(catalog, "production");
    expect(shown.plans.map((p) => p.slug)).toEqual(["fertig"]);
    expect(shown.units.map((u) => u.slug)).toEqual(["a"]);
    expect(shown.goals.map((g) => g.id)).toEqual(["z"]);
    expect(shown.goals[0].levels.map((l) => l.id)).toEqual(["weiter"]);
    expect(shown.goals[0].units).toEqual(["a"]);
  });
});

describe("Alle Pläne und Einheiten", () => {
  it("Art und Sportart filtern Pläne und Einheiten", () => {
    const all = filterCatalog(CATALOG, { kind: null, sportId: null });
    expect(all.plans).toHaveLength(CATALOG.plans.length);
    expect(all.units).toHaveLength(CATALOG.units.length);
    expect(filterCatalog(CATALOG, { kind: "plaene", sportId: null }).units).toEqual([]);
    expect(filterCatalog(CATALOG, { kind: "einheiten", sportId: null }).plans).toEqual([]);
    const strength = filterCatalog(CATALOG, {
      kind: null,
      sportId: "krafttraining",
    });
    expect(strength.units.every((u) => u.sportId === "krafttraining")).toBe(true);
    // Der 10-km-Plan enthält eine Krafteinheit und erscheint deshalb auch bei Krafttraining
    expect(strength.plans.map((p) => p.slug)).toContain("10-km");
  });

  it("Nur bekannte Arten aus der Adresse gelten", () => {
    expect(toCatalogKind("plaene")).toBe("plaene");
    expect(toCatalogKind("alles")).toBeNull();
    expect(toCatalogKind(undefined)).toBeNull();
  });

  it("Sportarten für die Chips kommen aus dem Katalog, jede einmal", () => {
    expect(catalogSportIds(CATALOG)).toEqual(["laufen", "krafttraining"]);
  });

  it("Eine Einheit kennt die Pläne, in denen sie vorkommt", () => {
    expect(plansWithUnit(CATALOG, "ganzkoerper-a").map((p) => p.slug)).toEqual(["10-km", "kraft-aufbauen"]);
  });
});

describe("Suche", () => {
  const sports = new Map([
    ["laufen", { name: "Laufen", category: "ausdauer" as const, aliases: ["Joggen", "Running"] }],
    ["krafttraining", { name: "Krafttraining", category: "kraft" as const, aliases: ["Gym", "Fitnessstudio"] }],
  ]);
  const all = { plans: CATALOG.plans, units: CATALOG.units };
  const search = (q: string) => searchCatalog(CATALOG, all, q, sports);
  const slugs = (r: { plans: readonly { slug: string }[]; units: readonly { slug: string }[] }) => ({
    plans: r.plans.map((p) => p.slug),
    units: r.units.map((u) => u.slug),
  });

  it("Ohne Suchwort bleibt alles in der Reihenfolge des Katalogs", () => {
    expect(slugs(search("  "))).toEqual(slugs(all));
  });

  it("Groß- und Kleinschreibung und Umlaute spielen keine Rolle", () => {
    expect(slugs(search("GANZKORPER")).units).toEqual(["ganzkoerper-a", "ganzkoerper-b"]);
    expect(slugs(search("ganzkörper")).units).toEqual(["ganzkoerper-a", "ganzkoerper-b"]);
  });

  it("Suchbegriffe der Sportart finden ihre Pläne und Einheiten", () => {
    const r = slugs(search("joggen"));
    expect(r.units).toContain("langer-lauf");
    expect(r.units).not.toContain("ganzkoerper-a");
    expect(r.plans).toEqual(["erste-5-km", "10-km"]);
  });

  it("Eine Übung im Ablauf findet die Einheit und die Pläne, die sie enthalten", () => {
    const r = slugs(search("Kniebeuge"));
    expect(r.units).toEqual(["ganzkoerper-a"]);
    expect(r.plans).toEqual(["10-km", "kraft-aufbauen"]);
  });

  it("Bei mehreren Wörtern muss jedes vorkommen", () => {
    expect(slugs(search("langer lauf")).units).toEqual(["langer-lauf"]);
    expect(slugs(search("langer kniebeuge")).units).toEqual([]);
  });

  it("„5km“ findet „5 km“, Treffer im Titel stehen oben", () => {
    expect(searchWords("5km")).toEqual(["5", "km"]);
    expect(slugs(search("5km")).plans[0]).toBe("erste-5-km");
    expect(slugs(search("10 km")).plans[0]).toBe("10-km");
  });

  it("Suchbegriffe ohne Wort im Text finden den Plan", () => {
    expect(slugs(search("couch to 5k")).plans).toEqual(["erste-5-km"]);
  });

  it("Die Suche wirkt nur auf die übergebene Auswahl", () => {
    const onlyUnits = searchCatalog(CATALOG, { plans: [], units: CATALOG.units }, "kniebeuge", sports);
    expect(slugs(onlyUnits)).toEqual({ plans: [], units: ["ganzkoerper-a"] });
  });

  it("Lange Suchen werden gekürzt, höchstens acht Wörter", () => {
    expect(searchWords("a b c d e f g h i j")).toHaveLength(8);
    expect(searchWords("x".repeat(100))[0]).toHaveLength(60);
  });
});

describe("Was man bei einer Einheit einträgt", () => {
  it("Laufen: Dauer, Distanz, Höhenmeter und Anstrengung", () => {
    expect(trackedFields({ hasDistance: true, hasElevation: true, hasSets: false })).toEqual([
      "Dauer",
      "Distanz in km",
      "Höhenmeter",
      "Wie anstrengend",
    ]);
  });

  it("Bouldern: Dauer und Anstrengung", () => {
    expect(
      trackedFields({
        hasDistance: false,
        hasElevation: false,
        hasSets: false,
      }),
    ).toEqual(["Dauer", "Wie anstrengend"]);
  });

  it("Krafttraining: Übungen mit Sätzen", () => {
    expect(
      trackedFields({
        hasDistance: false,
        hasElevation: false,
        hasSets: true,
      })[0],
    ).toMatch(/Sätzen/);
  });
});

// Der Katalog wird von Hand und später von einer KI gepflegt. Diese Regeln fangen Fehler vor dem Merge.
describe("Katalog", () => {
  const units = new Map(CATALOG.units.map((u) => [u.slug, u]));
  const plans = new Map(CATALOG.plans.map((p) => [p.slug, p]));
  const migrations = readFileSync(
    path.resolve(import.meta.dirname, "../../../supabase/migrations/20261005160000_sports_and_cities.sql"),
    "utf8",
  );

  it("Adressen sind eindeutig und bestehen aus Kleinbuchstaben, Ziffern und Bindestrichen", () => {
    for (const slugs of [
      CATALOG.plans.map((p) => p.slug),
      CATALOG.units.map((u) => u.slug),
      CATALOG.goals.map((g) => g.id),
    ]) {
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("Jede Einheit hat eine Sportart aus dem Katalog, eine Dauer und einen Ablauf", () => {
    for (const u of CATALOG.units) {
      expect(migrations, u.slug).toContain(`('${u.sportId}',`);
      expect(u.minutes, u.slug).toBeGreaterThan(0);
      expect(u.steps.length, u.slug).toBeGreaterThan(0);
      expect(u.why, u.slug).not.toBe("");
    }
  });

  it("Jeder Plan hat sieben Tage mit bekannten Einheiten, Quellen und passende Phasen und Zwischenziele", () => {
    for (const p of CATALOG.plans) {
      expect(p.week, p.slug).toHaveLength(7);
      for (const slug of p.week) if (slug) expect(units.has(slug), `${p.slug}: ${slug}`).toBe(true);
      expect(p.sources.length, p.slug).toBeGreaterThan(0);
      // Ein fertiger Plan verweist nicht auf eine Einheit im Entwurf
      if (!p.draft)
        for (const slug of p.week) if (slug) expect(units.get(slug)?.draft, `${p.slug}: ${slug}`).toBeFalsy();
      // Phasen decken alle Wochen lückenlos ab
      const covered = p.phases.flatMap((ph) => Array.from({ length: ph.to - ph.from + 1 }, (_, i) => ph.from + i));
      expect(covered, p.slug).toEqual(Array.from({ length: p.weeks }, (_, i) => i + 1));
      for (const m of p.milestones) expect(m.week >= 1 && m.week <= p.weeks, `${p.slug}: Woche ${m.week}`).toBe(true);
      if (p.lighterDay !== null) expect(p.week[p.lighterDay], p.slug).not.toBeNull();
    }
  });

  it("Ziele verweisen auf bekannte Pläne, Einheiten und Ziele", () => {
    const goalIds = new Set(CATALOG.goals.map((g) => g.id));
    for (const g of CATALOG.goals) {
      expect(g.levels.length, g.id).toBeGreaterThan(0);
      expect(
        g.levels.some((l) => l.path.length > 0),
        g.id,
      ).toBe(true);
      for (const l of g.levels) {
        for (const slug of l.path) expect(plans.has(slug), `${g.id}: ${slug}`).toBe(true);
        if (l.path.length === 0) expect(l.note, `${g.id}/${l.id}`).toBeTruthy();
        if (l.next) expect(goalIds.has(l.next), `${g.id}/${l.id}`).toBe(true);
      }
      for (const slug of g.units) expect(units.has(slug), `${g.id}: ${slug}`).toBe(true);
    }
  });
});
