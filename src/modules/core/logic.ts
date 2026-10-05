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
  public: "Jeder kann sie finden und beitreten. Mitglieder sehen Rangliste und Bestwerte, aber keine einzelnen Aktivitäten.",
  private: "Beitritt nur über den Link. Alle Mitglieder sehen gegenseitig ihre Aktivitäten.",
  coaching: "Beitritt nur über den Link. Der Coach sieht die Aktivitäten aller Mitglieder, sie sehen einander nicht.",
};

/** Was ein Beitritt bedeutet, aus Sicht der eingeladenen Person. Steht vor dem Beitritt. */
export const COMMUNITY_JOIN_HINT: Record<CommunityKind, string> = {
  public: "Wenn du beitrittst, sehen die Mitglieder dein Profil, deine Trainingstage und Bestwerte, aber keine einzelnen Aktivitäten.",
  private: "Wenn du beitrittst, sehen die Mitglieder deine Aktivitäten und du ihre.",
  coaching: "Wenn du beitrittst, sieht der Coach deine Aktivitäten. Die anderen Mitglieder sehen sie nicht.",
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

// ---------- Sportarten ----------

export type SportCategory = "ausdauer" | "outdoor" | "kraft" | "klettern" | "ballsport" | "koerper" | "sonstiges";

/** Überschriften der Bereiche im Katalog, in der Reihenfolge der Anzeige. */
export const SPORT_CATEGORY_LABEL: Record<SportCategory, string> = {
  ausdauer: "Ausdauer",
  outdoor: "Outdoor",
  kraft: "Kraft und Fitness",
  klettern: "Klettern",
  ballsport: "Ballsport",
  koerper: "Körper und Geist",
  sonstiges: "Sonstiges",
};

export function toSportCategory(value: string): SportCategory {
  return value in SPORT_CATEGORY_LABEL ? (value as SportCategory) : "sonstiges";
}

/** Sucht im Katalog nach Name oder Suchbegriff, ohne Groß- und Kleinschreibung und Umlaute zu unterscheiden. */
export function matchesSport(sport: { name: string; aliases: readonly string[] }, query: string): boolean {
  const fold = (t: string) =>
    t
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/ß/g, "ss")
      .trim();
  const q = fold(query);
  if (!q) return true;
  return [sport.name, ...sport.aliases].some((t) => fold(t).includes(q));
}

// ---------- Profil ----------

export const MAX_SPORTS = 5;
export const MAX_BIO = 160;

/** Sportarten getrimmt, ohne leere und doppelte Einträge (Groß-/Kleinschreibung egal). */
export function uniqueSports(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const sport = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    const key = sport.toLocaleLowerCase("de-DE");
    if (!sport || seen.has(key)) continue;
    seen.add(key);
    result.push(sport);
  }
  return result;
}

/** Sportarten zum Speichern: wie uniqueSports, höchstens fünf. Die Datenbank prüft dieselben Grenzen. */
export function normalizeSports(values: readonly string[]): string[] {
  return uniqueSports(values).slice(0, MAX_SPORTS);
}

/** Zeile unter dem Namen: "München · Laufen, Yoga". Leer, wenn nichts angegeben ist. */
export function describeProfile(p: { city: string | null; sports: readonly string[] }): string {
  return [p.city, p.sports.join(", ")].filter(Boolean).join(" · ");
}

/** Pfad, zu dem man nach der Registrierung zurückkehrt, um direkt beizutreten. */
export function joinAfterAuthPath(code: string, campaign: string | null = null): string {
  const base = `/beitreten/${encodeURIComponent(code)}?beitreten=1`;
  return campaign ? `${base}&quelle=${campaign}` : base;
}

/**
 * Kennung aus ?quelle= in einem geteilten Link, etwa „sticker-boulderwelt“. Nur Kleinbuchstaben,
 * Ziffern und Bindestriche, höchstens 40 Zeichen; alles andere zählt als keine Kennung.
 */
export function campaignTag(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^[a-z0-9-]{1,40}$/.test(value) ? value : null;
}

/** Öffentlicher Link zu einem Event. Mit zusagen: nach Anmeldung oder Registrierung gleich zusagen. */
export function publicEventPath(id: string, options: { zusagen?: boolean; campaign?: string | null } = {}): string {
  const params = new URLSearchParams();
  if (options.zusagen) params.set("zusagen", "1");
  if (options.campaign) params.set("quelle", options.campaign);
  const query = params.toString();
  return query ? `/e/${id}?${query}` : `/e/${id}`;
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

export type PlanDay = { date: string; weekday: string; label: string; isToday: boolean };

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

/**
 * Kalenderwoche in deutscher Zeit, Montag bis Sonntag. offset verschiebt um ganze Wochen.
 * from und to begrenzen die Woche als Zeitpunkte (to ist der folgende Montag, 0 Uhr).
 */
export function berlinWeek(now: Date, offset = 0): { days: PlanDay[]; from: Date; to: Date } {
  const today = berlinDateTimeParts(now).date;
  const [y, m, d] = today.split("-").map(Number);
  const todayUtc = Date.UTC(y, m - 1, d);
  const mondayIndex = (new Date(todayUtc).getUTCDay() + 6) % 7;
  const monday = todayUtc - mondayIndex * 86400000 + offset * 7 * 86400000;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  const days = WEEKDAYS.map((weekday, i) => {
    const date = iso(monday + i * 86400000);
    const [, mm, dd] = date.split("-").map(Number);
    return { date, weekday, label: `${weekday} ${dd}.${mm}.`, isToday: date === today };
  });
  return {
    days,
    from: berlinLocalToDate(days[0].date, "00:00") as Date,
    to: berlinLocalToDate(iso(monday + 7 * 86400000), "00:00") as Date,
  };
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

/** Kalendereintrag (iCalendar) für ein geplantes Training, mit zwei Stunden Dauer. */
export function buildMeetupIcs(meetup: {
  id: string;
  title: string;
  startsAt: string;
  place: string | null;
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
    ...(meetup.place ? [`LOCATION:${escape(meetup.place)}`] : []),
    "DESCRIPTION:Geplant mit OHealth",
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

// ---------- Mitteilungen ----------

export type NotificationKind =
  | "new_training"
  | "joined"
  | "message"
  | "cancelled"
  | "reminder"
  | "community_message"
  | "direct_message"
  | "follow_request"
  | "new_follower"
  | "follow_accepted"
  | "message_request"
  | "changed";

const NOTIFICATION_KINDS: readonly NotificationKind[] = [
  "new_training",
  "joined",
  "message",
  "cancelled",
  "reminder",
  "community_message",
  "direct_message",
  "follow_request",
  "new_follower",
  "follow_accepted",
  "message_request",
  "changed",
];

/** Mitteilungen zu Chat-Nachrichten: nur für den Push, in der App zählt der Tab „Chats“. */
export const CHAT_NOTIFICATION_KINDS = ["message", "community_message", "direct_message", "message_request"] as const;

export function toNotificationKind(value: string): NotificationKind {
  return NOTIFICATION_KINDS.find((k) => k === value) ?? "new_training";
}

/** Ein Satz je Mitteilung, sachlich wie im Rest der App. */
export function describeNotification(n: { kind: NotificationKind; actorName: string; title: string; count: number }): string {
  switch (n.kind) {
    case "new_training":
      return `${n.actorName} plant „${n.title}“`;
    case "joined":
      return `${n.actorName} ist bei „${n.title}“ dabei`;
    case "message":
      return n.count > 1
        ? `${n.count} neue Nachrichten zu „${n.title}“, zuletzt von ${n.actorName}`
        : `${n.actorName} hat zu „${n.title}“ geschrieben`;
    case "cancelled":
      return `${n.actorName} hat „${n.title}“ abgesagt`;
    case "changed":
      return `${n.actorName} hat Zeit oder Treffpunkt von „${n.title}“ geändert`;
    case "reminder":
      return `„${n.title}“ beginnt in etwa einer Stunde`;
    case "community_message":
      return n.count > 1
        ? `${n.count} neue Nachrichten in „${n.title}“, zuletzt von ${n.actorName}`
        : `${n.actorName} hat in „${n.title}“ geschrieben`;
    case "follow_request":
      return `${n.actorName} möchte dir folgen`;
    case "new_follower":
      return `${n.actorName} folgt dir jetzt`;
    case "follow_accepted":
      return `${n.actorName} hat deine Anfrage angenommen`;
    case "message_request":
      return `${n.actorName} möchte dir schreiben`;
    case "direct_message":
      return n.count > 1 ? `${n.count} neue Nachrichten von ${n.actorName}` : `${n.actorName} hat dir geschrieben`;
  }
}

/**
 * Inhalt eines Pushs. Bei Chat-Nachrichten steht wie in Messengern die letzte Nachricht im
 * Text, sonst der Satz der Mitteilung.
 */
export function pushContent(p: {
  kind: NotificationKind;
  actorName: string;
  title: string;
  count: number;
  meetupId: string | null;
  chatId?: string | null;
  actorId?: string | null;
  latest: string | null;
}): { title: string; body: string; url: string; tag: string } {
  const isChat =
    p.kind === "message" ||
    p.kind === "community_message" ||
    p.kind === "direct_message" ||
    p.kind === "message_request";
  const url =
    isChat && p.chatId
      ? `/chats/${p.chatId}`
      : p.kind === "follow_request"
        ? "/verbindungen?tab=anfragen"
        : (p.kind === "new_follower" || p.kind === "follow_accepted") && p.actorId
          ? `/person/${p.actorId}`
          : p.meetupId
            ? p.kind === "message"
              ? `/plan/${p.meetupId}/chat`
              : `/plan/${p.meetupId}`
            : "/mitteilungen";
  if (isChat && p.latest) {
    // Im Privatchat steht der Name schon im Titel, wie in Messengern
    const text = p.kind === "direct_message" ? p.latest : `${p.actorName}: ${p.latest}`;
    return {
      title: p.title,
      body: p.count > 1 ? `${text} (${p.count} neue)` : text,
      url,
      tag: `chat-${p.chatId ?? p.meetupId}`,
    };
  }
  return { title: "OHealth", body: describeNotification(p), url, tag: `${p.kind}-${p.meetupId ?? p.title}` };
}

/** Wann, relativ zu jetzt: "gerade eben", "vor 5 Min.", "vor 3 Std.", sonst Datum. */
export function formatAgo(at: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(at).getTime()) / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes}\u00a0Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours}\u00a0Std.`;
  return new Intl.DateTimeFormat("de-DE", { timeZone: APP_TIME_ZONE, day: "numeric", month: "short" }).format(
    new Date(at),
  );
}

/** Zähler an der Glocke: ab 10 nur noch "9+". */
export function badgeCount(count: number): string {
  return count > 9 ? "9+" : String(count);
}

/** Wie lange vorher ein Training unter "Gleich" erscheint. */
export const REMINDER_HOURS = 3;

// ---------- Chat ----------

type ChatMessage = { id: string; userId: string; createdAt: string };

/** Tagestrenner im Chat: "Heute", "Gestern", sonst "Sa, 3. Okt." (deutsche Zeit). */
export function chatDayLabel(at: string, now: Date): string {
  const day = berlinDateTimeParts(new Date(at)).date;
  const today = berlinDateTimeParts(now).date;
  const yesterday = berlinDateTimeParts(new Date(now.getTime() - 86400000)).date;
  if (day === today) return "Heute";
  if (day === yesterday) return "Gestern";
  return new Intl.DateTimeFormat("de-DE", { timeZone: APP_TIME_ZONE, weekday: "short", day: "numeric", month: "short" })
    .format(new Date(at))
    .replace(/^(\w+)\./, "$1");
}

/** Uhrzeit einer Nachricht, z. B. "18:05". */
export function chatTime(at: string): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(
    new Date(at),
  );
}

/** Zeitpunkt der letzten Nachricht in der Chat-Liste: heute die Uhrzeit, gestern "Gestern", sonst das Datum. */
export function chatListTime(at: string, now: Date): string {
  const label = chatDayLabel(at, now);
  if (label === "Heute") return chatTime(at);
  if (label === "Gestern") return label;
  return new Intl.DateTimeFormat("de-DE", { timeZone: APP_TIME_ZONE, day: "numeric", month: "numeric" }).format(
    new Date(at),
  );
}

/**
 * Ordnet Nachrichten für die Anzeige: Tagestrenner vor dem ersten Beitrag eines Tages, und ob eine
 * Nachricht eine Folge derselben Person ist (innerhalb von fünf Minuten, dann ohne Namen und enger).
 */
export function layoutChat<T extends ChatMessage>(
  messages: readonly T[],
  now: Date,
): { message: T; dayLabel: string | null; firstInGroup: boolean; lastInGroup: boolean }[] {
  const GAP_MS = 5 * 60 * 1000;
  const dayOf = (m: T) => berlinDateTimeParts(new Date(m.createdAt)).date;
  const continues = (a: T | undefined, b: T | undefined) =>
    !!a && !!b && a.userId === b.userId && dayOf(a) === dayOf(b) &&
    Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) <= GAP_MS;

  return messages.map((message, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const newDay = !prev || dayOf(prev) !== dayOf(message);
    return {
      message,
      dayLabel: newDay ? chatDayLabel(message.createdAt, now) : null,
      firstInGroup: newDay || !continues(prev, message),
      lastInGroup: !continues(message, next),
    };
  });
}

// ---------- Zahlen, Dauer und Distanz (für Aktivitäten und Events) ----------

/** Zahl in deutscher Schreibweise, z. B. 82.5 -> "82,5". */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Liest Eingaben mit Komma oder Punkt: "82,5" -> 82.5. Ungültig -> null. */
export function parseDecimal(input: string): number | null {
  const cleaned = input.trim().replace(",", ".");
  if (cleaned === "" || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** Distanz als "800 m" oder "5,2 km". */
export function formatDistance(meters: number): { value: string; unit: string } {
  if (meters < 1000) return { value: formatNumber(Math.round(meters)), unit: "m" };
  return { value: formatNumber(meters / 1000, 1), unit: "km" };
}

/** Dauer in Minuten in Worten: "52 min", "1 h 05 min". */
export function formatActivityDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}\u00a0min`;
  return `${Math.floor(minutes / 60)}\u00a0h ${String(minutes % 60).padStart(2, "0")}\u00a0min`;
}

/** Stunden und Minuten aus dem Formular zu Minuten. Ungültig oder 0 -> null. */
export function parseDurationMinutes(hours: string, minutes: string): number | null {
  const h = hours.trim() === "" ? 0 : Number(hours);
  const m = minutes.trim() === "" ? 0 : Number(minutes);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0 || m > 59) return null;
  const total = h * 60 + m;
  return total >= 1 && total <= 1440 ? total : null;
}

/** Kilometer mit Komma oder Punkt zu Metern: "8,2" -> 8200. Leer -> null, ungültig -> NaN. */
export function parseDistanceKm(input: string): number | null {
  if (input.trim() === "") return null;
  const km = parseDecimal(input);
  if (km === null || km <= 0 || km > 1000) return Number.NaN;
  return Math.round(km * 1000 * 10) / 10;
}

// ---------- Events je Sportart ----------

export type MeetupLevel = "einsteiger" | "gemischt" | "fortgeschritten";
export type PaceUnit = "min_km" | "kmh";

export const MEETUP_LEVELS: readonly MeetupLevel[] = ["einsteiger", "gemischt", "fortgeschritten"];

export const MEETUP_LEVEL_LABEL: Record<MeetupLevel, string> = {
  einsteiger: "Einsteiger willkommen",
  gemischt: "Gemischtes Niveau",
  fortgeschritten: "Fortgeschritten",
};

export function toMeetupLevel(value: string | null): MeetupLevel | null {
  return MEETUP_LEVELS.find((l) => l === value) ?? null;
}

export function toPaceUnit(value: string | null): PaceUnit | null {
  return value === "min_km" || value === "kmh" ? value : null;
}

/** Tempo in Sekunden je km als "6:00 min/km". */
export function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  return `${minutes}:${String(secondsPerKm % 60).padStart(2, "0")} min/km`;
}

/** "6:00", "6.30" oder "6" (Minuten je km) zu Sekunden. Leer -> null, ungültig oder außerhalb 1 bis 60 min -> NaN. */
export function parsePace(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const match = /^(\d{1,2})(?:[:.,](\d{2}))?$/.exec(trimmed);
  if (!match) return Number.NaN;
  const seconds = Number(match[1]) * 60 + Number(match[2] ?? 0);
  if (Number(match[2] ?? 0) > 59 || seconds < 60 || seconds > 3600) return Number.NaN;
  return seconds;
}

/** Höhenmeter als ganze Zahl: "450" -> 450. Leer -> null, sonst ungültig oder über 20.000 -> NaN. */
export function parseElevation(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (!/^\d{1,5}$/.test(trimmed) || Number(trimmed) > 20000) return Number.NaN;
  return Number(trimmed);
}

/** Geschwindigkeit als "27,5 km/h", ganze Zahlen ohne Nachkommastelle. */
export function formatSpeed(kmh: number): string {
  return `${formatNumber(kmh, Number.isInteger(kmh) ? 0 : 1)} km/h`;
}

/** "27,5" zu 27.5 (eine Nachkommastelle). Leer -> null, ungültig oder außerhalb 1 bis 99,9 -> NaN. */
export function parseSpeed(input: string): number | null {
  if (input.trim() === "") return null;
  const value = parseDecimal(input);
  if (value === null || value < 1 || value > 99.9) return Number.NaN;
  return Math.round(value * 10) / 10;
}

/**
 * Kurzbeschreibung eines Events: "Laufen · 60 min · 10 km · 6:00 min/km · Einsteiger willkommen".
 * Fehlende Angaben fallen weg; ohne Sportart (alte Events) beginnt sie mit der Dauer. Heißt das Event
 * wie seine Sportart, steht sie nicht noch einmal da.
 */
export function describeMeetupDetails(m: {
  title?: string;
  sportName: string | null;
  durationMinutes: number | null;
  distanceM: number | null;
  elevationM: number | null;
  paceSecondsPerKm: number | null;
  speedKmh: number | null;
  level: MeetupLevel | null;
}): string {
  const distance = m.distanceM ? formatDistance(m.distanceM) : null;
  return [
    m.sportName !== m.title ? m.sportName : null,
    m.durationMinutes ? formatActivityDuration(m.durationMinutes) : null,
    distance ? `${distance.value} ${distance.unit}` : null,
    m.elevationM ? `${formatNumber(m.elevationM)} Hm` : null,
    m.paceSecondsPerKm ? formatPace(m.paceSecondsPerKm) : null,
    m.speedKmh ? formatSpeed(m.speedKmh) : null,
    m.level ? MEETUP_LEVEL_LABEL[m.level] : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Meldung für einen Fehler beim Planen eines Events. Die Prüfung der Datenbank (Migration
 * meetup_sports) meldet auf Deutsch, was nicht zur Sportart passt; diese Texte werden übernommen.
 */
export function meetupErrorMessage(error: { code?: string; message?: string } | null): string | null {
  const message = error?.message ?? "";
  if (error?.code === "23514" && /^(Zu .+ gibt es|Ohne Sportart gibt es|Den Tag änderst du)/.test(message)) {
    return `${message}.`;
  }
  if (error?.code === "23503" && message.startsWith("Die Sportart")) return "Wähl eine Sportart aus der Liste.";
  return null;
}

/** Uhrzeit von Beginn bis Ende in deutscher Zeit: "18:30–19:30". Ohne Dauer nur der Beginn. */
export function meetupTimeRange(startsAt: string, durationMinutes: number | null): string {
  const start = berlinDateTimeParts(new Date(startsAt)).time;
  if (!durationMinutes) return start;
  const end = berlinDateTimeParts(new Date(Date.parse(startsAt) + durationMinutes * 60_000)).time;
  return `${start}\u2013${end}`;
}

/** Angaben eines Events als Zeilen für die Detailseite. Fehlende Angaben fallen weg. */
export function meetupDetailRows(m: Parameters<typeof describeMeetupDetails>[0]): { label: string; value: string }[] {
  const distance = m.distanceM ? formatDistance(m.distanceM) : null;
  const rows: [string, string | null][] = [
    ["Sportart", m.sportName],
    ["Dauer", m.durationMinutes ? formatActivityDuration(m.durationMinutes) : null],
    ["Distanz", distance ? `${distance.value} ${distance.unit}` : null],
    ["Höhenmeter", m.elevationM ? `${formatNumber(m.elevationM)} Hm` : null],
    ["Tempo", m.paceSecondsPerKm ? formatPace(m.paceSecondsPerKm) : m.speedKmh ? formatSpeed(m.speedKmh) : null],
    ["Niveau", m.level ? MEETUP_LEVEL_LABEL[m.level] : null],
  ];
  return rows.flatMap(([label, value]) => (value ? [{ label, value }] : []));
}

const weeklyFormat = new Intl.DateTimeFormat("de-DE", { timeZone: APP_TIME_ZONE, weekday: "long" });

/** Rhythmus einer Reihe aus einem ihrer Termine: "Jeden Dienstag, 18:30 Uhr". */
export function describeWeekly(startsAt: string): string {
  const date = new Date(startsAt);
  return `Jeden ${weeklyFormat.format(date)}, ${berlinDateTimeParts(date).time}\u00a0Uhr`;
}

/** Vorbelegung des Formulars „Training bearbeiten“, alle Angaben als Text wie im Formular. */
export type MeetupFormValues = {
  id: string;
  seriesId: string | null;
  sportId: string | null;
  templateId: string | null;
  title: string;
  hours: string;
  minutes: string;
  distance: string;
  elevation: string;
  pace: string;
  speed: string;
  level: MeetupLevel | null;
  place: string;
  max: string;
  note: string;
};

const toInput = (value: number) => String(value).replace(".", ",");

export function meetupFormValues(m: {
  id: string;
  seriesId: string | null;
  sportId: string | null;
  templateId: string | null;
  title: string;
  durationMinutes: number | null;
  distanceM: number | null;
  elevationM: number | null;
  paceSecondsPerKm: number | null;
  speedKmh: number | null;
  level: MeetupLevel | null;
  place: string | null;
  maxParticipants: number | null;
  note: string | null;
}): MeetupFormValues {
  return {
    id: m.id,
    seriesId: m.seriesId,
    sportId: m.sportId,
    templateId: m.templateId,
    title: m.title,
    hours: m.durationMinutes ? String(Math.floor(m.durationMinutes / 60)) : "1",
    minutes: m.durationMinutes ? String(m.durationMinutes % 60) : "0",
    distance: m.distanceM ? toInput(m.distanceM / 1000) : "",
    elevation: m.elevationM !== null ? String(m.elevationM) : "",
    pace: m.paceSecondsPerKm
      ? `${Math.floor(m.paceSecondsPerKm / 60)}:${String(m.paceSecondsPerKm % 60).padStart(2, "0")}`
      : "",
    speed: m.speedKmh ? toInput(m.speedKmh) : "",
    level: m.level,
    place: m.place ?? "",
    max: m.maxParticipants ? String(m.maxParticipants) : "",
    note: m.note ?? "",
  };
}
