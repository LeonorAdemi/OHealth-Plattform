// Reine Funktionen ohne Seiteneffekte. Tests: logic.test.ts

import type { ExerciseMeasure } from "@/lib/domain";
import { berlinLocalToDate } from "@/modules/core/logic";

// Draft 1 rechnet fest in deutscher Zeit, passend zur View v_training_days.
export const APP_TIME_ZONE = "Europe/Berlin";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Kalendertag in der App-Zeitzone als "JJJJ-MM-TT". */
export function dayKey(date: Date, timeZone: string = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcToKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Die sieben Tage der laufenden Woche, Montag bis Sonntag. */
export function weekKeys(now: Date, timeZone: string = APP_TIME_ZONE): string[] {
  const today = keyToUtc(dayKey(now, timeZone));
  const weekday = (new Date(today).getUTCDay() + 6) % 7; // Montag = 0
  const monday = today - weekday * DAY_MS;
  return Array.from({ length: 7 }, (_, i) => utcToKey(monday + i * DAY_MS));
}

/** Für jeden Wochentag (Mo bis So): Wurde trainiert? */
export function weekGrid(
  trainingDays: readonly string[],
  now: Date,
  timeZone: string = APP_TIME_ZONE,
): boolean[] {
  const trained = new Set(trainingDays);
  return weekKeys(now, timeZone).map((key) => trained.has(key));
}

/**
 * Serie in Wochen: aufeinanderfolgende Wochen (Montag bis Sonntag) mit mindestens einem Trainingstag.
 * Zählt bis zur laufenden Woche; ist sie noch ohne Training, endet die Serie mit der Vorwoche.
 */
export function weekStreak(trainingDays: readonly string[], now: Date, timeZone: string = APP_TIME_ZONE): number {
  const mondays = new Set(
    trainingDays.map((key) => {
      const ms = keyToUtc(key);
      return ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY_MS;
    }),
  );
  let monday = keyToUtc(weekKeys(now, timeZone)[0]);
  if (!mondays.has(monday)) monday -= 7 * DAY_MS;
  let streak = 0;
  while (mondays.has(monday)) {
    streak += 1;
    monday -= 7 * DAY_MS;
  }
  return streak;
}

/** Kalenderwoche nach ISO 8601. */
export function isoWeek(now: Date, timeZone: string = APP_TIME_ZONE): number {
  const today = keyToUtc(dayKey(now, timeZone));
  const weekday = (new Date(today).getUTCDay() + 6) % 7;
  const thursday = today + (3 - weekday) * DAY_MS;
  const yearStart = Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1);
  return Math.floor((thursday - yearStart) / (7 * DAY_MS)) + 1;
}

/** Zahl in deutscher Schreibweise, z. B. 82.5 -> "82,5". */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Gewicht ohne überflüssige Nachkommastellen: 80 -> "80", 82.5 -> "82,5". */
export function formatWeight(kg: number): string {
  return formatNumber(kg, Number.isInteger(kg) ? 0 : 1);
}

/** Liest Eingaben mit Komma oder Punkt: "82,5" -> 82.5. Ungültig -> null. */
export function parseDecimal(input: string): number | null {
  const cleaned = input.trim().replace(",", ".");
  if (cleaned === "" || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

// rest: Pause vor dem Satz in Sekunden. Nur bei Trainings mit Zeitmessung, bleibt bei Korrekturen erhalten.
export type DraftSet = { value: string; weight: string; rest?: number | null };
export type DraftEntry = { exerciseId: string; measure: ExerciseMeasure; sets: DraftSet[] };

export type SetPayload = {
  exercise_id: string;
  set_number: number;
  reps?: number;
  duration_seconds?: number;
  distance_m?: number;
  weight_kg: number;
  rest_seconds?: number;
};

/**
 * Macht aus dem Formularentwurf die Sätze für log_workout.
 * Leere Zeilen werden übersprungen, ungültige Eingaben als Fehler gemeldet.
 */
export function buildSetsPayload(
  entries: readonly DraftEntry[],
): { ok: true; sets: SetPayload[] } | { ok: false; error: string } {
  const sets: SetPayload[] = [];

  for (const entry of entries) {
    let setNumber = 0;

    for (const set of entry.sets) {
      if (set.value.trim() === "" && set.weight.trim() === "") continue;

      const value = parseDecimal(set.value);
      if (value === null || value <= 0) {
        return { ok: false, error: "Trag bei jedem Satz einen Wert größer als 0 ein." };
      }

      const weight = set.weight.trim() === "" ? 0 : parseDecimal(set.weight);
      if (weight === null) {
        return { ok: false, error: "Das Gewicht muss eine Zahl sein, zum Beispiel 82,5." };
      }

      setNumber += 1;
      const base = {
        exercise_id: entry.exerciseId,
        set_number: setNumber,
        ...(typeof set.rest === "number" ? { rest_seconds: set.rest } : {}),
      };

      if (entry.measure === "weight_reps") {
        if (!Number.isInteger(value)) {
          return { ok: false, error: "Wiederholungen müssen ganze Zahlen sein." };
        }
        sets.push({ ...base, reps: value, weight_kg: weight });
      } else if (entry.measure === "duration") {
        sets.push({ ...base, duration_seconds: Math.round(value), weight_kg: weight });
      } else {
        sets.push({ ...base, distance_m: value, weight_kg: 0 });
      }
    }
  }

  if (sets.length === 0) {
    return { ok: false, error: "Trag mindestens einen Satz ein." };
  }
  return { ok: true, sets };
}

export type LeaderboardRow = {
  userId: string;
  name: string;
  isMe: boolean;
  days: boolean[];
  count: number;
};

/** Konstanz-Rangliste der Woche: meiste Trainingstage zuerst, bei Gleichstand nach Name. */
export function buildLeaderboard(
  members: readonly { userId: string; name: string }[],
  trainingDays: readonly { userId: string; day: string }[],
  me: string,
  now: Date,
  timeZone: string = APP_TIME_ZONE,
): LeaderboardRow[] {
  return members
    .map((member) => {
      const days = weekGrid(
        trainingDays.filter((t) => t.userId === member.userId).map((t) => t.day),
        now,
        timeZone,
      );
      return {
        userId: member.userId,
        name: member.name,
        isMe: member.userId === me,
        days,
        count: days.filter(Boolean).length,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de"));
}

export type SetRow = {
  reps: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
  weight_kg: number;
  exercises: { name: string } | null;
};

/** Eine Zeile je Übung für den Verlauf, z. B. "Bankdrücken: 3 Sätze, bis 82,5 kg". */
export function summarizeSets(sets: readonly SetRow[]): string[] {
  const byExercise = new Map<string, { count: number; maxWeight: number }>();

  for (const set of sets) {
    const name = set.exercises?.name ?? "Übung";
    const entry = byExercise.get(name) ?? { count: 0, maxWeight: 0 };
    entry.count += 1;
    entry.maxWeight = Math.max(entry.maxWeight, set.weight_kg);
    byExercise.set(name, entry);
  }

  return Array.from(byExercise, ([name, { count, maxWeight }]) => {
    const setsLabel = `${count} ${count === 1 ? "Satz" : "Sätze"}`;
    const weightLabel = maxWeight > 0 ? `, bis ${formatWeight(maxWeight)}\u00a0kg` : "";
    return `${name}: ${setsLabel}${weightLabel}`;
  });
}

// ---------- Aktivität ----------

/** Wie anstrengend eine Aktivität war, Stufe 1 bis 5 wie in workouts.feeling. */
export const FEELING_LABEL: Readonly<Record<number, string>> = {
  1: "locker",
  2: "leicht",
  3: "mittel",
  4: "hart",
  5: "am Limit",
};

/** Dauer in Minuten in Worten: "52 min", "1 h 05 min". */
export function formatActivityDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}\u00a0min`;
  return `${Math.floor(minutes / 60)}\u00a0h ${String(minutes % 60).padStart(2, "0")}\u00a0min`;
}

/** Distanz mit Einheit: 8200 -> "8,2 km". */
export function formatDistanceText(meters: number): string {
  const { value, unit } = formatDistance(meters);
  return `${value}\u00a0${unit}`;
}

/**
 * Kurzbeschreibung einer Aktivität für Listen: "Laufen · 45 min · 8,2 km".
 * Bei Krafttraining mit Sätzen statt Distanz die Zahl der Sätze.
 */
export function describeActivity(a: {
  sportName: string;
  durationMinutes: number | null;
  distanceM: number | null;
  elevationM?: number | null;
  setCount: number;
}): string {
  return [
    a.sportName,
    a.durationMinutes ? formatActivityDuration(a.durationMinutes) : null,
    a.distanceM ? formatDistanceText(a.distanceM) : null,
    a.elevationM ? `${formatNumber(a.elevationM)}\u00a0Hm` : null,
    a.setCount > 0 ? `${a.setCount}\u00a0${a.setCount === 1 ? "Satz" : "Sätze"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Dauer einer Aktivität: eingetragen oder aus Start und Ende eines Trainings (bis 24 Stunden). */
export function activityMinutes(a: {
  durationMinutes: number | null;
  startedAt: string | null;
  finishedAt: string | null;
}): number | null {
  if (a.durationMinutes) return a.durationMinutes;
  if (!a.startedAt || !a.finishedAt) return null;
  const minutes = Math.round((Date.parse(a.finishedAt) - Date.parse(a.startedAt)) / 60000);
  return minutes >= 1 && minutes <= 1440 ? minutes : null;
}

/** Stunden und Minuten aus dem Formular zu Minuten ("0 h 90 min" ergibt 90). Ungültig oder 0 -> null. */
export function parseDurationMinutes(hours: string, minutes: string): number | null {
  const h = hours.trim() === "" ? 0 : Number(hours);
  const m = minutes.trim() === "" ? 0 : Number(minutes);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0) return null;
  const total = h * 60 + m;
  return total >= 1 && total <= 1440 ? total : null;
}

/** Kilometer mit Komma oder Punkt zu Metern: "8,2" -> 8200. Leer -> null, ungültig -> NaN. */
export function parseDistanceKm(input: string): number | null {
  if (input.trim() === "") return null;
  const km = parseDecimal(input);
  if (km === null || km <= 0 || km > 1000) return Number.NaN;
  const meters = Math.round(km * 1000 * 10) / 10;
  return meters > 0 ? meters : Number.NaN;
}

/** Meter als Kilometer für das Eingabefeld: 8200 -> "8,2", 12345.6 -> "12,346". */
export function distanceToKmInput(meters: number): string {
  return String(Math.round(meters) / 1000).replace(".", ",");
}

/** Frühestes Datum, das das Formular annimmt. */
export const ACTIVITY_MIN_DATE = "2000-01-01";

/** Fehlermeldung zu einem Datum "JJJJ-MM-TT" aus dem Formular, null wenn es passt. */
export function activityDateError(date: string, today: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || berlinLocalToDate(date, "12:00") === null) return "Gib ein Datum ein.";
  if (date > today) return "Eine Aktivität liegt nicht in der Zukunft.";
  if (date < ACTIVITY_MIN_DATE) return "Dieses Datum liegt zu weit zurück.";
  return null;
}

/**
 * Zeitpunkt der Aktivität aus dem gewählten Tag. Unverändertes Datum beim Bearbeiten behält die
 * gespeicherte Uhrzeit, heute heißt jetzt, frühere Tage mittags deutscher Zeit (damit der Tag sicher stimmt).
 */
export function activityPerformedAt(a: {
  date: string;
  today: string;
  now: Date;
  existing?: { date: string; performedAt: string };
}): string | null {
  if (a.existing && a.date === a.existing.date) return a.existing.performedAt;
  if (a.date === a.today) return a.now.toISOString();
  return berlinLocalToDate(a.date, "12:00")?.toISOString() ?? null;
}

// ---------- Bestwerte je Übung ----------

export type BestRow = {
  userId: string;
  bestE1rmKg: number | null;
  maxWeightKg: number | null;
  maxReps: number | null;
  maxDurationSeconds: number | null;
  totalDistanceM: number | null;
};

export type BestRankingRow = {
  userId: string;
  name: string;
  isMe: boolean;
  /** Hauptwert, z. B. "93,3" */
  value: string;
  /** Einheit zum Hauptwert, z. B. "kg" */
  unit: string;
  /** Zusatz in Klein, z. B. "schwerster Satz 80 kg" */
  detail: string | null;
};

/** Dauer als "45 s" oder "1:30 min". */
export function formatDuration(seconds: number): { value: string; unit: string } {
  if (seconds < 60) return { value: String(seconds), unit: "s" };
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return { value: `${minutes}:${rest}`, unit: "min" };
}

/** Distanz als "800 m" oder "5,2 km". */
export function formatDistance(meters: number): { value: string; unit: string } {
  if (meters < 1000) return { value: formatNumber(Math.round(meters)), unit: "m" };
  return { value: formatNumber(meters / 1000, 1), unit: "km" };
}

/** Vergleichswert einer Zeile je nach Messart. Größer ist besser. */
function bestScore(row: BestRow, measure: ExerciseMeasure): number {
  if (measure === "duration") return row.maxDurationSeconds ?? 0;
  if (measure === "distance") return row.totalDistanceM ?? 0;
  // Mit Last zählt das geschätzte Maximum. Ohne Last (Körpergewicht) zählen die
  // Wiederholungen, sie liegen immer unter jedem Wert mit Last.
  return row.bestE1rmKg !== null ? 1_000_000 + row.bestE1rmKg : (row.maxReps ?? 0);
}

/**
 * Rangliste der Bestwerte einer Übung für die Mitglieder einer Gruppe.
 * Kraftübungen: geschätztes Maximum für eine Wiederholung, bei Körpergewicht die
 * meisten Wiederholungen. Halteübungen: längste Dauer. Distanzübungen: Gesamtstrecke.
 */
export function buildBestRanking(
  members: readonly { userId: string; name: string }[],
  bests: readonly BestRow[],
  measure: ExerciseMeasure,
  me: string,
): BestRankingRow[] {
  const names = new Map(members.map((m) => [m.userId, m.name]));

  return bests
    .filter((row) => names.has(row.userId) && bestScore(row, measure) > 0)
    .sort(
      (a, b) =>
        bestScore(b, measure) - bestScore(a, measure) ||
        (names.get(a.userId) ?? "").localeCompare(names.get(b.userId) ?? "", "de"),
    )
    .map((row) => {
      const base = { userId: row.userId, name: names.get(row.userId) ?? "", isMe: row.userId === me };

      if (measure === "duration") {
        return { ...base, ...formatDuration(row.maxDurationSeconds ?? 0), detail: null };
      }
      if (measure === "distance") {
        return { ...base, ...formatDistance(row.totalDistanceM ?? 0), detail: "insgesamt" };
      }
      if (row.bestE1rmKg !== null) {
        return {
          ...base,
          value: formatNumber(row.bestE1rmKg, 1),
          unit: "kg",
          detail:
            row.maxWeightKg !== null
              ? `schwerster Satz ${formatWeight(row.maxWeightKg)}\u00a0kg`
              : null,
        };
      }
      return { ...base, value: String(row.maxReps ?? 0), unit: "Wdh.", detail: "ohne Zusatzgewicht" };
    });
}

// ---------- Workout ansehen und korrigieren ----------

export type StoredSet = {
  exerciseId: string;
  exerciseName: string;
  measure: ExerciseMeasure;
  reps: number | null;
  durationSeconds: number | null;
  distanceM: number | null;
  weightKg: number;
  restSeconds?: number | null;
};

export type ExerciseBlock = {
  exerciseId: string;
  exerciseName: string;
  measure: ExerciseMeasure;
  sets: StoredSet[];
};

/**
 * Fasst aufeinanderfolgende Sätze derselben Übung zu Blöcken zusammen.
 * Die Sätze müssen in gespeicherter Reihenfolge (position) übergeben werden.
 */
export function groupSetsIntoBlocks(sets: readonly StoredSet[]): ExerciseBlock[] {
  const blocks: ExerciseBlock[] = [];

  for (const set of sets) {
    const last = blocks.at(-1);
    if (last && last.exerciseId === set.exerciseId) {
      last.sets.push(set);
    } else {
      blocks.push({
        exerciseId: set.exerciseId,
        exerciseName: set.exerciseName,
        measure: set.measure,
        sets: [set],
      });
    }
  }
  return blocks;
}

/** Ein Satz als lesbare Zeile, z. B. "5 × 82,5 kg", "8 Wdh.", "1:30 min", "5,2 km". */
export function formatSetLine(set: StoredSet): string {
  if (set.measure === "duration") {
    const { value, unit } = formatDuration(set.durationSeconds ?? 0);
    return `${value}\u00a0${unit}`;
  }
  if (set.measure === "distance") {
    const { value, unit } = formatDistance(set.distanceM ?? 0);
    return `${value}\u00a0${unit}`;
  }
  if (set.weightKg > 0) {
    return `${set.reps ?? 0}\u00a0×\u00a0${formatWeight(set.weightKg)}\u00a0kg`;
  }
  return `${set.reps ?? 0}\u00a0Wdh.`;
}

/** Wandelt gespeicherte Sätze in den Formularentwurf zurück, mit deutschem Dezimalkomma. */
export function toDraftEntries(sets: readonly StoredSet[]): { exerciseId: string; sets: DraftSet[] }[] {
  const decimal = (value: number) => String(value).replace(".", ",");

  return groupSetsIntoBlocks(sets).map((block) => ({
    exerciseId: block.exerciseId,
    sets: block.sets.map((set) => {
      const rest = set.restSeconds ?? null;
      if (block.measure === "duration") {
        return { value: String(set.durationSeconds ?? ""), weight: "", rest };
      }
      if (block.measure === "distance") {
        return { value: set.distanceM === null ? "" : decimal(set.distanceM), weight: "", rest };
      }
      return {
        value: String(set.reps ?? ""),
        weight: set.weightKg > 0 ? decimal(set.weightKg) : "",
        rest,
      };
    }),
  }));
}

// ---------- Übung suchen ----------

export type SearchableExercise = {
  id: string;
  name: string;
  muscleGroup: string | null;
  aliases: readonly string[];
};

/** Vereinheitlicht Text für die Suche: klein, ohne Umlaut-Punkte und Akzente, ß als ss. */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Sucht Übungen nach Name, Suchbegriffen (z. B. englischer Name) und Muskelgruppe.
 * Jedes Wort der Eingabe muss vorkommen. Reihenfolge der Treffer:
 * exakter Name oder Suchbegriff, Namensanfang, Anfang eines Suchbegriffs,
 * Wortanfang im Namen, sonst im Namen, sonst in den Suchbegriffen, zuletzt Muskelgruppe.
 * Bei leerer Eingabe gibt es keine Treffer.
 */
export function searchExercises<T extends SearchableExercise>(
  exercises: readonly T[],
  query: string,
  limit = 8,
): T[] {
  const needle = normalizeForSearch(query);
  const words = needle.split(" ").filter(Boolean);
  if (words.length === 0) return [];

  const scored: { exercise: T; score: number }[] = [];

  for (const exercise of exercises) {
    const name = normalizeForSearch(exercise.name);
    const aliases = exercise.aliases.map(normalizeForSearch);
    const group = normalizeForSearch(exercise.muscleGroup ?? "");
    const everything = [name, ...aliases, group].join(" | ");

    if (!words.every((word) => everything.includes(word))) continue;

    let score = 6;
    if (name === needle || aliases.includes(needle)) score = 0;
    else if (name.startsWith(needle)) score = 1;
    else if (aliases.some((alias) => alias.startsWith(needle))) score = 2;
    else if (name.split(" ").some((part) => part.startsWith(words[0]))) score = 3;
    else if (name.includes(words[0])) score = 4;
    else if (aliases.some((alias) => alias.includes(words[0]))) score = 5;

    scored.push({ exercise, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.exercise.name.localeCompare(b.exercise.name, "de"))
    .slice(0, limit)
    .map((entry) => entry.exercise);
}

/** Die Muskelgruppen des Katalogs in fester, sinnvoller Reihenfolge. */
export function muscleGroups(exercises: readonly SearchableExercise[]): string[] {
  const order = ["Brust", "Rücken", "Schultern", "Arme", "Beine", "Gesäß", "Rumpf", "Ganzkörper", "Ausdauer"];
  const present = new Set(exercises.flatMap((e) => (e.muscleGroup ? [e.muscleGroup] : [])));
  const known = order.filter((group) => present.has(group));
  const others = Array.from(present)
    .filter((group) => !order.includes(group))
    .sort((a, b) => a.localeCompare(b, "de"));
  return [...known, ...others];
}

// ---------- Vorlagen ----------

export const MAX_TEMPLATE_EXERCISES = 30;
export const DEFAULT_TARGET_SETS = 3;

export type TemplateVisibility = "private" | "public";

/** Grenzt den Wert aus der Datenbank ein. Unbekanntes gilt als privat. */
export function toTemplateVisibility(value: string): TemplateVisibility {
  return value === "public" ? "public" : "private";
}

/** Eine Übung im Vorlagenformular. Alle Felder sind Texteingaben. */
export type TemplateDraftEntry = {
  exerciseId: string;
  measure: ExerciseMeasure;
  sets: string;
  value: string;
  weight: string;
};

export type TemplateExercisePayload = {
  exercise_id: string;
  target_sets: number;
  target_reps?: number;
  target_weight_kg?: number;
  target_duration_seconds?: number;
  target_distance_m?: number;
};

/**
 * Macht aus dem Formularentwurf die Übungen für save_template.
 * Sätze fehlen oder sind leer: drei. Zielwert und Gewicht sind freiwillig.
 */
export function buildTemplatePayload(
  entries: readonly TemplateDraftEntry[],
): { ok: true; exercises: TemplateExercisePayload[] } | { ok: false; error: string } {
  if (entries.length === 0) {
    return { ok: false, error: "Füg mindestens eine Übung hinzu." };
  }
  if (entries.length > MAX_TEMPLATE_EXERCISES) {
    return { ok: false, error: `Eine Vorlage hat höchstens ${MAX_TEMPLATE_EXERCISES} Übungen.` };
  }

  const exercises: TemplateExercisePayload[] = [];

  for (const [index, entry] of entries.entries()) {
    const label = `Übung ${index + 1}`;

    const sets = entry.sets.trim() === "" ? DEFAULT_TARGET_SETS : parseDecimal(entry.sets);
    if (sets === null || !Number.isInteger(sets) || sets < 1 || sets > 20) {
      return { ok: false, error: `${label}: Die Zahl der Sätze liegt zwischen 1 und 20.` };
    }

    const payload: TemplateExercisePayload = { exercise_id: entry.exerciseId, target_sets: sets };

    if (entry.value.trim() !== "") {
      const value = parseDecimal(entry.value);
      if (value === null || value <= 0) {
        return { ok: false, error: `${label}: Der Zielwert muss größer als 0 sein.` };
      }
      if (entry.measure === "weight_reps") {
        if (!Number.isInteger(value)) {
          return { ok: false, error: `${label}: Wiederholungen müssen ganze Zahlen sein.` };
        }
        payload.target_reps = value;
      } else if (entry.measure === "duration") {
        payload.target_duration_seconds = Math.round(value);
      } else {
        payload.target_distance_m = value;
      }
    }

    if (entry.measure === "weight_reps" && entry.weight.trim() !== "") {
      const weight = parseDecimal(entry.weight);
      if (weight === null || weight > 9999) {
        return { ok: false, error: `${label}: Das Gewicht muss eine Zahl sein, zum Beispiel 82,5.` };
      }
      payload.target_weight_kg = weight;
    }

    exercises.push(payload);
  }

  return { ok: true, exercises };
}

export type StoredTemplateExercise = {
  exerciseId: string;
  exerciseName: string;
  measure: ExerciseMeasure;
  targetSets: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationSeconds: number | null;
  targetDistanceM: number | null;
};

/** Zielwerte einer Übung als lesbare Zeile, z. B. "4 × 8 · 60 kg", "3 × 45 s", "3 Sätze". */
export function formatTemplateTarget(exercise: StoredTemplateExercise): string {
  const nbsp = " ";
  const sets = exercise.targetSets;
  let target: string | null = null;

  if (exercise.measure === "duration" && exercise.targetDurationSeconds !== null) {
    const { value, unit } = formatDuration(exercise.targetDurationSeconds);
    target = `${value}${nbsp}${unit}`;
  } else if (exercise.measure === "distance" && exercise.targetDistanceM !== null) {
    const { value, unit } = formatDistance(exercise.targetDistanceM);
    target = `${value}${nbsp}${unit}`;
  } else if (exercise.measure === "weight_reps" && exercise.targetReps !== null) {
    target = String(exercise.targetReps);
  }

  const weight =
    exercise.measure === "weight_reps" && exercise.targetWeightKg !== null && exercise.targetWeightKg > 0
      ? `${formatWeight(exercise.targetWeightKg)}${nbsp}kg`
      : null;

  if (target === null) return `${sets}${nbsp}${sets === 1 ? "Satz" : "Sätze"}`;
  const line = `${sets}${nbsp}×${nbsp}${target}`;
  return weight ? `${line} · ${weight}` : line;
}

/** Wandelt gespeicherte Übungen in den Formularentwurf zurück, mit deutschem Dezimalkomma. */
export function toTemplateDraftEntries(
  exercises: readonly StoredTemplateExercise[],
): TemplateDraftEntry[] {
  const decimal = (value: number) => String(value).replace(".", ",");

  return exercises.map((exercise) => {
    let value = "";
    if (exercise.measure === "duration") {
      value = exercise.targetDurationSeconds === null ? "" : String(exercise.targetDurationSeconds);
    } else if (exercise.measure === "distance") {
      value = exercise.targetDistanceM === null ? "" : decimal(exercise.targetDistanceM);
    } else {
      value = exercise.targetReps === null ? "" : String(exercise.targetReps);
    }

    return {
      exerciseId: exercise.exerciseId,
      measure: exercise.measure,
      sets: String(exercise.targetSets),
      value,
      weight:
        exercise.measure === "weight_reps" && exercise.targetWeightKg !== null && exercise.targetWeightKg > 0
          ? decimal(exercise.targetWeightKg)
          : "",
    };
  });
}

/** Bezeichnung der Herkunft einer Version für den Versionsverlauf. */
export function versionSourceLabel(source: string): string {
  return source === "ai" ? "KI" : "App";
}

// ---------- Training ----------

/** Uhrzeit-Format für Dauer und Pause: "0:45", "12:03", "1:02:03". */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Schlüssel des laufenden Trainings im Speicher des Geräts. Ein Training je Gerät. */
export const TRAINING_KEY = "ohealth:training";

export type TrainingSet = {
  value: string;
  weight: string;
  /** Zeitpunkt des Abhakens in ms, null = noch offen */
  doneAt: number | null;
  /** Pause vor dem Satz in Sekunden, gemessen beim Abhaken */
  restSeconds: number | null;
};

export type TrainingEntry = {
  exerciseId: string;
  measure: ExerciseMeasure;
  /** false: im Training hinzugefügt, gehört nicht zur Vorlage */
  fromTemplate: boolean;
  sets: TrainingSet[];
};

export type TrainingSession = {
  version: 1;
  id: string;
  templateId: string | null;
  templateVersionId: string | null;
  title: string;
  startedAt: number;
  /** Laufende oder zuletzt beendete Pause, beginnt mit dem Abhaken eines Satzes */
  rest: { startedAt: number; endedAt: number | null } | null;
  entries: TrainingEntry[];
};

const decimalText = (value: number) => String(value).replace(".", ",");

/** Werte eines gespeicherten Satzes als Eingabetext. */
function setToInput(measure: ExerciseMeasure, set: StoredSet): { value: string; weight: string } {
  if (measure === "duration") return { value: set.durationSeconds === null ? "" : String(set.durationSeconds), weight: "" };
  if (measure === "distance") return { value: set.distanceM === null ? "" : decimalText(set.distanceM), weight: "" };
  return { value: set.reps === null ? "" : String(set.reps), weight: set.weightKg > 0 ? decimalText(set.weightKg) : "" };
}

/** Zielwerte einer Vorlagen-Übung als Eingabetext. */
function targetToInput(exercise: StoredTemplateExercise): { value: string; weight: string } {
  const [draft] = toTemplateDraftEntries([exercise]);
  return { value: draft.value, weight: draft.weight };
}

/**
 * Plant die Sätze eines Trainings aus einer Vorlage. Je Übung so viele Sätze wie die Vorlage
 * vorsieht. Vorbelegt wird mit den Werten vom letzten Mal (Satz für Satz, sonst der letzte
 * Satz), ohne frühere Werte mit den Zielwerten der Vorlage.
 */
export function planTrainingEntries(
  exercises: readonly StoredTemplateExercise[],
  lastSets: ReadonlyMap<string, readonly StoredSet[]>,
): TrainingEntry[] {
  return exercises.map((exercise) => {
    const last = lastSets.get(exercise.exerciseId) ?? [];
    const count = Math.max(1, exercise.targetSets);
    const sets: TrainingSet[] = Array.from({ length: count }, (_, i) => {
      const source = last[i] ?? last.at(-1);
      const input = source ? setToInput(exercise.measure, source) : targetToInput(exercise);
      return { ...input, doneAt: null, restSeconds: null };
    });
    return { exerciseId: exercise.exerciseId, measure: exercise.measure, fromTemplate: true, sets };
  });
}

/** Eine im Training hinzugefügte Übung, vorbelegt mit dem letzten Mal, falls vorhanden. */
export function extraTrainingEntry(
  exerciseId: string,
  measure: ExerciseMeasure,
  last: readonly StoredSet[] = [],
): TrainingEntry {
  const count = Math.max(1, last.length);
  const sets = Array.from({ length: count }, (_, i) => {
    const source = last[i];
    return {
      ...(source ? setToInput(measure, source) : { value: "", weight: "" }),
      doneAt: null,
      restSeconds: null,
    };
  });
  return { exerciseId, measure, fromTemplate: false, sets };
}

/** Sekunden der laufenden Pause, null ohne Pause. Beendete Pausen bleiben stehen. */
export function restElapsed(session: TrainingSession, now: number): number | null {
  if (!session.rest) return null;
  return Math.max(0, Math.round(((session.rest.endedAt ?? now) - session.rest.startedAt) / 1000));
}

/**
 * Hakt einen Satz ab: Die bisherige Pause wird dem Satz zugeordnet, danach beginnt eine neue.
 * Vor dem ersten abgehakten Satz gibt es keine Pause.
 */
export function completeSet(session: TrainingSession, entryIndex: number, setIndex: number, now: number): TrainingSession {
  const target = session.entries[entryIndex]?.sets[setIndex];
  if (!target || target.doneAt !== null) return session;

  const restSeconds = restElapsed(session, now);
  const entries = session.entries.map((entry, ei) =>
    ei !== entryIndex
      ? entry
      : { ...entry, sets: entry.sets.map((set, si) => (si === setIndex ? { ...set, doneAt: now, restSeconds } : set)) },
  );
  return { ...session, entries, rest: { startedAt: now, endedAt: null } };
}

/** Nimmt das Abhaken zurück. Die Pause läuft unverändert weiter. */
export function reopenSet(session: TrainingSession, entryIndex: number, setIndex: number): TrainingSession {
  const entries = session.entries.map((entry, ei) =>
    ei !== entryIndex
      ? entry
      : {
          ...entry,
          sets: entry.sets.map((set, si) => (si === setIndex ? { ...set, doneAt: null, restSeconds: null } : set)),
        },
  );
  return { ...session, entries };
}

/** Beendet die laufende Pause, zum Beispiel wenn der nächste Satz beginnt. */
export function endRest(session: TrainingSession, now: number): TrainingSession {
  if (!session.rest || session.rest.endedAt !== null) return session;
  return { ...session, rest: { ...session.rest, endedAt: now } };
}

/**
 * Macht aus den abgehakten Sätzen die Nutzlast für log_training.
 * Offene Sätze zählen nicht, sie sind nur vorbelegt.
 */
export function buildTrainingPayload(
  entries: readonly TrainingEntry[],
): { ok: true; sets: SetPayload[] } | { ok: false; error: string } {
  const done = entries.map((entry) => ({ ...entry, sets: entry.sets.filter((set) => set.doneAt !== null) }));

  if (done.every((entry) => entry.sets.length === 0)) {
    return { ok: false, error: "Hak mindestens einen Satz ab." };
  }
  if (done.some((entry) => entry.sets.some((set) => set.value.trim() === ""))) {
    return { ok: false, error: "Trag bei jedem abgehakten Satz einen Wert ein." };
  }

  return buildSetsPayload(
    done.map((entry) => ({
      exerciseId: entry.exerciseId,
      measure: entry.measure,
      sets: entry.sets.map((set) => ({ value: set.value, weight: set.weight, rest: set.restSeconds })),
    })),
  );
}

/** Liest ein gespeichertes Training. Alles, was nicht passt, gilt als kein Training. */
export function parseTrainingSession(raw: string | null): TrainingSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<TrainingSession>;
    if (value.version !== 1 || typeof value.id !== "string" || typeof value.startedAt !== "number" || !Array.isArray(value.entries)) {
      return null;
    }
    return value as TrainingSession;
  } catch {
    return null;
  }
}

// ---------- Verlauf je Übung ----------

export type ExerciseSessionRow = {
  workoutId: string;
  performedAt: string;
  setCount: number;
  maxWeightKg: number | null;
  totalReps: number | null;
  bestE1rmKg: number | null;
  maxDurationSeconds: number | null;
  totalDistanceM: number | null;
};

/** Ein Workout im Verlauf einer Übung, z. B. "3 Sätze · bis 62,5 kg · 22 Wdh.". */
export function formatSessionSummary(row: ExerciseSessionRow, measure: ExerciseMeasure): string {
  const parts = [`${row.setCount}\u00a0${row.setCount === 1 ? "Satz" : "Sätze"}`];
  if (measure === "duration" && row.maxDurationSeconds !== null) {
    const { value, unit } = formatDuration(row.maxDurationSeconds);
    parts.push(`bis ${value}\u00a0${unit}`);
  } else if (measure === "distance" && row.totalDistanceM !== null) {
    const { value, unit } = formatDistance(row.totalDistanceM);
    parts.push(`${value}\u00a0${unit}`);
  } else if (measure === "weight_reps") {
    if (row.maxWeightKg !== null && row.maxWeightKg > 0) parts.push(`bis ${formatWeight(row.maxWeightKg)}\u00a0kg`);
    if (row.totalReps !== null) parts.push(`${row.totalReps}\u00a0Wdh.`);
  }
  return parts.join(" · ");
}

/** Sätze vom letzten Mal in einer Zeile: "8 × 60 kg, 8 × 62,5 kg, 6 × 62,5 kg". */
export function formatLastSets(sets: readonly StoredSet[]): string {
  return sets.map(formatSetLine).join(", ");
}

// ---------- Letzte Aktivitäten ----------

const whenDay = new Intl.DateTimeFormat("de-DE", { timeZone: APP_TIME_ZONE, weekday: "short", day: "numeric", month: "short" });
const whenTime = new Intl.DateTimeFormat("de-DE", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit" });

/** Wann ein Workout war: "Heute, 13:42", "Gestern, 09:10" oder "Mo., 28. Sept., 18:05". */
export function formatWorkoutWhen(performedAt: string, now: Date): string {
  const date = new Date(performedAt);
  const time = whenTime.format(date);
  const day = dayKey(date);
  if (day === dayKey(now)) return `Heute, ${time}`;
  if (day === dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return `Gestern, ${time}`;
  return `${whenDay.format(date)}, ${time}`;
}
