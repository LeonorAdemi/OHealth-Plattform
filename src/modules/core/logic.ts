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
