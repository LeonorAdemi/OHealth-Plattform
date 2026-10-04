// Reine Funktionen ohne Seiteneffekte. Tests: logic.test.ts

import type { ExerciseMeasure } from "@/lib/domain";

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

export type DraftSet = { value: string; weight: string };
export type DraftEntry = { exerciseId: string; measure: ExerciseMeasure; sets: DraftSet[] };

export type SetPayload = {
  exercise_id: string;
  set_number: number;
  reps?: number;
  duration_seconds?: number;
  distance_m?: number;
  weight_kg: number;
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
      const base = { exercise_id: entry.exerciseId, set_number: setNumber };

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
      if (block.measure === "duration") {
        return { value: String(set.durationSeconds ?? ""), weight: "" };
      }
      if (block.measure === "distance") {
        return { value: set.distanceM === null ? "" : decimal(set.distanceM), weight: "" };
      }
      return {
        value: String(set.reps ?? ""),
        weight: set.weightKg > 0 ? decimal(set.weightKg) : "",
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
