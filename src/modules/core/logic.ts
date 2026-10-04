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
export function describeCommunity(c: { sport: string | null; city: string | null; memberCount: number }): string {
  const members = `${c.memberCount}\u00a0${c.memberCount === 1 ? "Mitglied" : "Mitglieder"}`;
  return [c.sport, c.city, members].filter(Boolean).join(" · ");
}

/** Pfad, zu dem man nach der Registrierung zurückkehrt, um direkt beizutreten. */
export function joinAfterAuthPath(code: string): string {
  return `/beitreten/${encodeURIComponent(code)}?beitreten=1`;
}

// ---------- Treffen ----------

export const APP_TIME_ZONE = "Europe/Berlin";

/** Abstand der deutschen Zeit zu UTC in Minuten zu einem Zeitpunkt (Sommerzeit: 120). */
function berlinOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/**
 * Datum und Uhrzeit, wie sie jemand in Deutschland eingibt ("2026-10-10", "09:00"),
 * als Zeitpunkt. null bei ungültiger Eingabe.
 */
export function berlinLocalToDate(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [y, mo, da, h, mi] = [d[1], d[2], d[3], t[1], t[2]].map(Number);
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || h > 23 || mi > 59) return null;
  const naive = Date.UTC(y, mo - 1, da, h, mi);
  // Zweimal korrigieren, damit auch Tage mit Zeitumstellung stimmen.
  let result = naive - berlinOffsetMinutes(new Date(naive)) * 60000;
  result = naive - berlinOffsetMinutes(new Date(result)) * 60000;
  const check = new Date(result);
  return Number.isNaN(check.getTime()) ? null : check;
}

/** Tag und Uhrzeit in deutscher Zeit für Formularfelder: { date: "2026-10-10", time: "09:00" }. */
export function berlinDateTimeParts(at: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

const dayNumber = new Intl.DateTimeFormat("de-DE", { timeZone: APP_TIME_ZONE, day: "numeric" });
const monthShort = new Intl.DateTimeFormat("de-DE", { timeZone: APP_TIME_ZONE, month: "short" });
const weekdayShort = new Intl.DateTimeFormat("de-DE", { timeZone: APP_TIME_ZONE, weekday: "short" });
const timeShort = new Intl.DateTimeFormat("de-DE", { timeZone: APP_TIME_ZONE, hour: "numeric", minute: "2-digit" });

/** Datumsblock in der Liste: Tag groß, Monat klein, z. B. { day: "11", month: "Okt" }. */
export function meetupDateBlock(startsAt: string): { day: string; month: string } {
  const date = new Date(startsAt);
  return { day: dayNumber.format(date).replace(".", ""), month: monthShort.format(date).replace(".", "") };
}

/** Wochentag und Uhrzeit, z. B. "Sa 9:00". */
export function formatMeetupWhen(startsAt: string): string {
  const date = new Date(startsAt);
  return `${weekdayShort.format(date).replace(".", "")} ${timeShort.format(date)}`;
}

/** Zusagen: "8 dabei" oder, mit Höchstzahl, "5 von 12". */
export function describeMeetupCount(count: number, max: number | null): string {
  return max === null ? `${count}\u00a0dabei` : `${count} von ${max}`;
}

/** Ist ein Treffen voll? */
export function isMeetupFull(count: number, max: number | null): boolean {
  return max !== null && count >= max;
}

/** Kalendereintrag (iCalendar) für ein Treffen, mit zwei Stunden Dauer. */
export function buildMeetupIcs(meetup: {
  id: string;
  title: string;
  startsAt: string;
  place: string;
  communityName: string;
  url: string;
}): string {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (text: string) => text.replace(/\\/g, "\\\\").replace(/[;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const start = new Date(meetup.startsAt);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OHealth//Treffen//DE",
    "BEGIN:VEVENT",
    `UID:${meetup.id}@ohealth`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(meetup.title)}`,
    `LOCATION:${escape(meetup.place)}`,
    `DESCRIPTION:${escape(`${meetup.communityName} auf OHealth`)}`,
    `URL:${meetup.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Die ersten n einer Rangliste, dazu die eigene Zeile, falls sie weiter hinten steht. */
export function topWithMe<T extends { isMe: boolean }>(rows: readonly T[], n: number): { row: T; rank: number }[] {
  const ranked = rows.map((row, i) => ({ row, rank: i + 1 }));
  const top = ranked.slice(0, n);
  const me = ranked.find((r) => r.row.isMe);
  return me && me.rank > n ? [...top, me] : top;
}
