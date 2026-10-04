// Reine Funktionen ohne Seiteneffekte. Tests: logic.test.ts

export const AUTH_PROVIDERS = ["apple", "google", "facebook"] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/**
 * Liest die Liste der aktiven Anmelde-Anbieter aus NEXT_PUBLIC_AUTH_PROVIDERS,
 * z. B. "google,apple". Unbekannte Einträge werden ignoriert, die Reihenfolge
 * der Anzeige ist fest (Apple, Google, Facebook).
 */
export function enabledProviders(raw: string | undefined): AuthProvider[] {
  const wanted = new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
  return AUTH_PROVIDERS.filter((provider) => wanted.has(provider));
}

/** Passkeys (Face ID, Fingerabdruck) sind aktiv, wenn NEXT_PUBLIC_PASSKEYS auf "true" steht. */
export function passkeysEnabled(raw: string | undefined): boolean {
  return (raw ?? "").trim().toLowerCase() === "true";
}

/** Hängt das Ziel nach der Anmeldung an einen Pfad an, außer es ist die Startseite. */
export function withNext(path: string, next: string): string {
  return next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`;
}

// ---------- Community ----------

/** Art einer Community in der App. In der Datenbank: community, friends, coaching. */
export type CommunityKind = "public" | "private" | "coaching";

export function communityKind(type: string): CommunityKind {
  if (type === "community") return "public";
  if (type === "coaching") return "coaching";
  return "private";
}

export function groupTypeFor(kind: CommunityKind): "community" | "friends" | "coaching" {
  return kind === "public" ? "community" : kind === "coaching" ? "coaching" : "friends";
}

export const COMMUNITY_KIND_LABEL: Record<CommunityKind, string> = {
  public: "Öffentlich",
  private: "Privat",
  coaching: "Coaching",
};

/** Was Mitglieder voneinander sehen, je nach Art. Steht beim Erstellen und in der Community. */
export const COMMUNITY_KIND_HINT: Record<CommunityKind, string> = {
  public: "Jeder kann sie finden und beitreten. Mitglieder sehen Rangliste und Bestwerte, aber keine einzelnen Workouts.",
  private: "Beitritt nur über den Link. Alle Mitglieder sehen gegenseitig ihre Workouts.",
  coaching: "Beitritt nur über den Link. Der Coach sieht die Workouts aller Mitglieder, sie sehen einander nicht.",
};

/** Was ein Beitritt bedeutet, aus Sicht der eingeladenen Person. Steht vor dem Beitritt. */
export const COMMUNITY_JOIN_HINT: Record<CommunityKind, string> = {
  public: "Wenn du beitrittst, sehen die Mitglieder deinen Namen, deine Trainingstage und Bestwerte, aber keine einzelnen Workouts.",
  private: "Wenn du beitrittst, sehen die Mitglieder deine Workouts und du ihre.",
  coaching: "Wenn du beitrittst, sieht der Coach deine Workouts. Die anderen Mitglieder sehen sie nicht.",
};

/** Vorschläge für die Sportart. Frei eintippen geht trotzdem. */
export const SPORT_SUGGESTIONS = [
  "Laufen",
  "Krafttraining",
  "Radfahren",
  "Schwimmen",
  "Wandern",
  "Yoga",
  "Calisthenics",
  "CrossFit",
  "Klettern",
  "Fußball",
] as const;

/** Kurzbeschreibung für Listen und Link-Vorschauen: "Laufen · München · 12 Mitglieder". */
export function describeCommunity(c: { sport: string | null; location: string | null; memberCount: number }): string {
  const members = `${c.memberCount} ${c.memberCount === 1 ? "Mitglied" : "Mitglieder"}`;
  return [c.sport, c.location, members].filter(Boolean).join(" · ");
}

/** Pfad, zu dem man nach der Registrierung zurückkehrt, um direkt beizutreten. */
export function joinAfterAuthPath(code: string): string {
  return `/beitreten/${encodeURIComponent(code)}?beitreten=1`;
}
