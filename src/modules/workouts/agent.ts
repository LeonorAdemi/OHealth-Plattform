// Aufbereitung der eigenen Trainingsdaten für eine KI, die über MCP zugreift.
// Reine Funktionen ohne Seiteneffekte. Tests: agent.test.ts

import type { ExerciseMeasure } from "@/lib/domain";

import {
  APP_TIME_ZONE,
  dayKey,
  formatDistance,
  formatDuration,
  formatNumber,
  formatSetLine,
  formatWeight,
  groupSetsIntoBlocks,
  isoWeek,
  weekKeys,
  type StoredSet,
} from "./logic";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Woher die Daten kommen. In der App: queries.ts, in Tests: Beispieldaten. */
export type AgentDataSource = {
  profile(): Promise<{ displayName: string; memberSince: string } | null>;
  workoutCount(): Promise<number>;
  workoutsSince(since: Date, limit: number): Promise<AgentWorkout[]>;
  trainingDaysSince(day: string): Promise<string[]>;
  bests(): Promise<AgentBest[]>;
};

export type AgentWorkout = {
  performedAt: string;
  title: string | null;
  sets: (StoredSet & { muscleGroup: string | null })[];
};

export type AgentBest = {
  exerciseName: string;
  muscleGroup: string | null;
  measure: ExerciseMeasure;
  bestE1rmKg: number | null;
  maxWeightKg: number | null;
  maxReps: number | null;
  maxDurationSeconds: number | null;
  totalDistanceM: number | null;
};

// Geschützte Leerzeichen lesen sich für eine KI wie Sonderzeichen.
const plain = (text: string) => text.replaceAll("\u00a0", " ");

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Montag der Woche, die weeks - 1 Wochen vor der laufenden liegt, als "JJJJ-MM-TT". */
export function firstDayOfWindow(now: Date, weeks: number): string {
  const monday = Date.parse(`${weekKeys(now)[0]}T00:00:00Z`);
  return new Date(monday - (weeks - 1) * 7 * DAY_MS).toISOString().slice(0, 10);
}

/** Workouts mit Sätzen je Übung, neueste zuerst, nur ab dem ersten Tag des Zeitraums. */
export function describeWorkouts(workouts: readonly AgentWorkout[], fromDay: string) {
  return workouts
    .filter((w) => dayKey(new Date(w.performedAt)) >= fromDay)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
    .map((w) => ({
      datum: dateFormat.format(new Date(w.performedAt)),
      titel: w.title,
      uebungen: groupSetsIntoBlocks(w.sets).map((block) => ({
        name: block.exerciseName,
        muskelgruppe: w.sets.find((s) => s.exerciseId === block.exerciseId)?.muscleGroup ?? null,
        saetze: block.sets.map((set) => plain(formatSetLine(set))),
      })),
    }));
}

/** Trainingstage je Kalenderwoche, neueste Woche zuerst. Die laufende Woche ist markiert. */
export function consistencyByWeek(days: readonly string[], now: Date, weeks: number) {
  const trained = new Set(days);
  const currentMonday = Date.parse(`${weekKeys(now)[0]}T00:00:00Z`);

  return Array.from({ length: weeks }, (_, i) => {
    const monday = currentMonday - i * 7 * DAY_MS;
    const keys = Array.from({ length: 7 }, (_, d) =>
      new Date(monday + d * DAY_MS).toISOString().slice(0, 10),
    );
    return {
      kalenderwoche: isoWeek(new Date(monday + 12 * 60 * 60 * 1000)),
      ab: keys[0],
      trainingstage: keys.filter((k) => trained.has(k)).length,
      laufendeWoche: i === 0,
    };
  });
}

/** Bestwert einer Übung als lesbarer Satz, nach denselben Regeln wie die Rangliste. */
export function describeBest(best: AgentBest): string {
  if (best.measure === "duration") {
    const { value, unit } = formatDuration(best.maxDurationSeconds ?? 0);
    return `längste Dauer ${value} ${unit}`;
  }
  if (best.measure === "distance") {
    const { value, unit } = formatDistance(best.totalDistanceM ?? 0);
    return `insgesamt ${value} ${unit}`;
  }
  if (best.bestE1rmKg !== null) {
    const heaviest =
      best.maxWeightKg !== null ? `, schwerster Satz ${formatWeight(best.maxWeightKg)} kg` : "";
    return `geschätztes Maximum für eine Wiederholung ${formatNumber(best.bestE1rmKg, 1)} kg${heaviest}`;
  }
  return `meiste Wiederholungen ohne Zusatzgewicht: ${best.maxReps ?? 0}`;
}

export function describeBests(bests: readonly AgentBest[]) {
  return [...bests]
    .sort(
      (a, b) =>
        (a.muscleGroup ?? "").localeCompare(b.muscleGroup ?? "", "de") ||
        a.exerciseName.localeCompare(b.exerciseName, "de"),
    )
    .map((b) => ({ uebung: b.exerciseName, muskelgruppe: b.muscleGroup, bestwert: describeBest(b) }));
}
