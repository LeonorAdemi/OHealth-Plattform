// Katalog der Pläne und Einheiten (docs/bereiche/plaene.md). Für alle gleich und deshalb im Code,
// nicht in der Datenbank: Änderungen laufen als Pull Request durch die Prüfung. Einträge mit
// draft sind Beispiele ohne geprüfte Quelle und erscheinen nicht in Produktion.

export type Intensity = "locker" | "mittel" | "hart";

/** Eine Einheit: ein einzelnes Training mit Ablauf. sportId ist die ID aus dem Sportarten-Katalog. */
export type Unit = {
  slug: string;
  title: string;
  sportId: string;
  minutes: number;
  intensity: Intensity;
  steps: readonly { amount: string; text: string }[];
  why: string;
  /** Suchbegriffe, die nicht im Text stehen (etwa „Couch to 5k“) */
  keywords?: readonly string[];
  draft?: boolean;
};

/**
 * Ein Plan über mehrere Wochen. week ist die Grundwoche von Montag bis Sonntag mit der Einheit je
 * Tag (null: frei). In leichteren Wochen (jede lighterEvery-te) und in den taperWeeks vor dem Ziel
 * entfällt die Einheit am lighterDay.
 */
export type Plan = {
  slug: string;
  title: string;
  weeks: number;
  level: string;
  prerequisite: string;
  week: readonly (string | null)[];
  lighterDay: number | null;
  lighterEvery: number | null;
  taperWeeks: number;
  phases: readonly { from: number; to: number; title: string; text: string }[];
  milestones: readonly { week: number; text: string }[];
  basis: string;
  sources: readonly string[];
  /** Suchbegriffe, die nicht im Text stehen (etwa „Couch to 5k“) */
  keywords?: readonly string[];
  draft?: boolean;
};

/**
 * Wo jemand heute steht, und welche Pläne von dort zum Ziel führen, in dieser Reihenfolge. Ohne Pläne
 * ist das Ziel schon erreicht: note sagt das, next nennt das nächste Ziel.
 */
export type GoalLevel = {
  id: string;
  label: string;
  path: readonly string[];
  note?: string;
  next?: string;
};

export type Goal = {
  id: string;
  label: string;
  levels: readonly GoalLevel[];
  units: readonly string[];
};

export type Catalog = {
  goals: readonly Goal[];
  plans: readonly Plan[];
  units: readonly Unit[];
};

const UNITS: readonly Unit[] = [
  {
    slug: "gehen-und-laufen",
    title: "Gehen und Laufen im Wechsel",
    sportId: "laufen",
    minutes: 30,
    intensity: "locker",
    steps: [
      { amount: "5 min", text: "Zügig gehen" },
      { amount: "8 × 1 min", text: "Langsam laufen, dazwischen 90 s gehen" },
      { amount: "5 min", text: "Gehen" },
    ],
    why: "Der Körper gewöhnt sich an die Belastung, bevor Sehnen und Knochen überlastet werden.",
    draft: true,
  },
  {
    slug: "lockerer-dauerlauf",
    title: "Lockerer Dauerlauf",
    sportId: "laufen",
    minutes: 40,
    intensity: "locker",
    steps: [
      {
        amount: "40 min",
        text: "Gleichmäßig und so locker, dass du dich unterhalten kannst",
      },
    ],
    why: "Der größte Teil jedes Laufplans. Baut Ausdauer auf, ohne müde zu machen.",
    draft: true,
  },
  {
    slug: "tempodauerlauf-3x10",
    title: "Tempodauerlauf 3 × 10 min",
    sportId: "laufen",
    minutes: 50,
    intensity: "hart",
    steps: [
      { amount: "15 min", text: "Einlaufen, locker" },
      {
        amount: "3 × 10 min",
        text: "Zügig, anstrengend, aber kontrolliert. Dazwischen 2 min traben.",
      },
      { amount: "10 min", text: "Auslaufen" },
    ],
    why: "Verschiebt die Schwelle, ab der es sauer wird. Höchstens einmal pro Woche.",
    draft: true,
  },
  {
    slug: "langer-lauf",
    title: "Langer Lauf",
    sportId: "laufen",
    minutes: 60,
    intensity: "locker",
    steps: [
      { amount: "50 min", text: "Locker, gleichmäßig" },
      { amount: "10 min", text: "Etwas zügiger, wenn es sich gut anfühlt" },
    ],
    why: "Grundlage für längere Strecken. Die Dauer zählt, nicht das Tempo.",
    draft: true,
  },
  {
    slug: "ganzkoerper-a",
    title: "Ganzkörper A",
    sportId: "krafttraining",
    minutes: 50,
    intensity: "mittel",
    steps: [
      { amount: "3 × 6–8", text: "Kniebeuge" },
      { amount: "3 × 6–8", text: "Bankdrücken" },
      { amount: "3 × 8–10", text: "Rudern am Kabel" },
      { amount: "3 × 8–10", text: "Rumänisches Kreuzheben" },
      { amount: "2 × 10–12", text: "Schulterdrücken" },
      { amount: "3 × 30 s", text: "Unterarmstütz" },
    ],
    why: "Zwei Wiederholungen vor dem Muskelversagen aufhören. Gelingen alle Sätze am oberen Ende, beim nächsten Mal 2,5 kg mehr.",
    draft: true,
  },
  {
    slug: "ganzkoerper-b",
    title: "Ganzkörper B",
    sportId: "krafttraining",
    minutes: 50,
    intensity: "mittel",
    steps: [
      { amount: "3 × 6–8", text: "Kreuzheben" },
      { amount: "3 × 8–10", text: "Schulterdrücken" },
      { amount: "3 × 6–10", text: "Klimmzüge oder Latzug" },
      { amount: "3 × 10–12", text: "Ausfallschritte" },
      { amount: "3 × 10–12", text: "Liegestütze" },
    ],
    why: "Ergänzt Ganzkörper A, damit jede Muskelgruppe zweimal pro Woche drankommt.",
    draft: true,
  },
];

const PLANS: readonly Plan[] = [
  {
    slug: "erste-5-km",
    title: "Erste 5 km",
    weeks: 8,
    level: "Einstieg",
    prerequisite: "Du kannst 30 Minuten zügig gehen. Mehr braucht es nicht.",
    week: ["gehen-und-laufen", null, "gehen-und-laufen", null, null, "gehen-und-laufen", null],
    lighterDay: null,
    lighterEvery: null,
    taperWeeks: 0,
    phases: [
      {
        from: 1,
        to: 3,
        title: "Gehen und Laufen",
        text: "Abwechselnd 1 bis 3 Minuten laufen und gehen",
      },
      {
        from: 4,
        to: 6,
        title: "Länger laufen",
        text: "Laufabschnitte bis 10 Minuten",
      },
      {
        from: 7,
        to: 8,
        title: "5 km am Stück",
        text: "Zweimal 20, dann 30 Minuten durchlaufen",
      },
    ],
    milestones: [
      { week: 1, text: "8 × 1 Minute laufen, dazwischen gehen" },
      { week: 4, text: "3 × 5 Minuten am Stück" },
      { week: 6, text: "20 Minuten ohne Pause" },
      { week: 8, text: "5 km am Stück" },
    ],
    basis: "Wer neu anfängt, steigert langsam: Der Wochenumfang wächst um höchstens 10 % pro Woche.",
    sources: ["Nielsen u. a. 2014, J Orthop Sports Phys Ther"],
    keywords: ["Anfänger", "Laufanfänger", "Couch to 5k"],
    draft: true,
  },
  {
    slug: "10-km",
    title: "10 km",
    weeks: 8,
    level: "Nach den ersten 5 km",
    prerequisite: "Du läufst 30 Minuten am Stück, etwa 5 km.",
    week: [null, "lockerer-dauerlauf", null, "tempodauerlauf-3x10", null, "ganzkoerper-a", "langer-lauf"],
    lighterDay: 5,
    lighterEvery: 4,
    taperWeeks: 1,
    phases: [
      {
        from: 1,
        to: 3,
        title: "Länger laufen",
        text: "Der lange Lauf wächst bis 60 Minuten",
      },
      {
        from: 4,
        to: 7,
        title: "Zügiger laufen",
        text: "Ein Tempolauf pro Woche",
      },
      {
        from: 8,
        to: 8,
        title: "Erholen vor dem Lauf",
        text: "Weniger Umfang, dann 10 km",
      },
    ],
    milestones: [
      { week: 3, text: "60 Minuten locker am Stück" },
      { week: 6, text: "3 × 10 Minuten zügig" },
      { week: 8, text: "10 km" },
    ],
    basis:
      "Erst die Dauer, dann das Tempo. Etwa 80 % der Zeit locker, ein harter Lauf pro Woche reicht. Der Wochenumfang wächst um höchstens 10 % pro Woche.",
    sources: ["Seiler 2010, Int J Sports Physiol Perform", "Nielsen u. a. 2014, J Orthop Sports Phys Ther"],
    draft: true,
  },
  {
    slug: "kraft-aufbauen",
    title: "Kraft aufbauen",
    weeks: 10,
    level: "Einstieg",
    prerequisite: "Keine. Die ersten zwei Wochen dienen dazu, die Übungen zu lernen.",
    week: ["ganzkoerper-a", null, "ganzkoerper-b", null, "ganzkoerper-a", null, null],
    lighterDay: null,
    lighterEvery: null,
    taperWeeks: 0,
    phases: [
      {
        from: 1,
        to: 2,
        title: "Technik lernen",
        text: "Leichte Gewichte, saubere Bewegung",
      },
      {
        from: 3,
        to: 10,
        title: "Steigern",
        text: "Jede Woche etwas mehr Gewicht oder Wiederholungen",
      },
    ],
    milestones: [
      { week: 2, text: "Alle Übungen sauber" },
      { week: 10, text: "Deutlich mehr Gewicht als in Woche 3" },
    ],
    basis:
      "Jede Muskelgruppe zweimal pro Woche, 10 bis 20 Sätze je Muskel und Woche, zwei Wiederholungen vor dem Muskelversagen aufhören.",
    sources: ["Schoenfeld u. a. 2016, Sports Med", "Schoenfeld u. a. 2017, J Sports Sci"],
    keywords: ["Anfänger", "Muskelaufbau", "Ganzkörperplan"],
    draft: true,
  },
];

const GOALS: readonly Goal[] = [
  {
    id: "5-km",
    label: "Erste 5 km",
    levels: [
      { id: "neu", label: "Ich laufe noch nicht", path: ["erste-5-km"] },
      {
        id: "30-min",
        label: "Ich laufe 30 Minuten am Stück",
        path: [],
        note: "Damit schaffst du 5 km schon.",
        next: "10-km",
      },
    ],
    units: ["gehen-und-laufen", "lockerer-dauerlauf"],
  },
  {
    id: "10-km",
    label: "10 km laufen",
    levels: [
      {
        id: "neu",
        label: "Ich laufe noch nicht",
        path: ["erste-5-km", "10-km"],
      },
      { id: "30-min", label: "Ich laufe 30 Minuten am Stück", path: ["10-km"] },
    ],
    units: ["lockerer-dauerlauf", "tempodauerlauf-3x10", "langer-lauf"],
  },
  {
    id: "kraft",
    label: "Kraft aufbauen",
    levels: [{ id: "neu", label: "Ich fange neu an", path: ["kraft-aufbauen"] }],
    units: ["ganzkoerper-a", "ganzkoerper-b"],
  },
];

export const CATALOG: Catalog = { goals: GOALS, plans: PLANS, units: UNITS };
