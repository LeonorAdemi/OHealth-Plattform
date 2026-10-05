// Aufbereitung der eigenen Trainingsdaten für eine KI, die über MCP zugreift.
// Reine Funktionen ohne Seiteneffekte. Tests: agent.test.ts

import type { ExerciseMeasure } from "@/lib/domain";

import {
  APP_TIME_ZONE,
  FEELING_LABEL,
  dayKey,
  formatActivityDuration,
  formatDistance,
  formatDuration,
  formatNumber,
  formatSetLine,
  formatWeight,
  groupSetsIntoBlocks,
  formatTemplateTarget,
  isoWeek,
  searchExercises,
  weekKeys,
  type StoredSet,
  type StoredTemplateExercise,
  type TemplateExercisePayload,
  type TemplateVisibility,
} from "./logic";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Woher die Daten kommen. In der App: queries.ts, in Tests: Beispieldaten. */
export type AgentDataSource = {
  profile(): Promise<{ displayName: string; memberSince: string } | null>;
  workoutCount(): Promise<number>;
  workoutsSince(since: Date, limit: number): Promise<AgentWorkout[]>;
  trainingDaysSince(day: string): Promise<string[]>;
  bests(): Promise<AgentBest[]>;
  /** Eigene Vorlagen, zuletzt geänderte zuerst */
  templates(): Promise<AgentTemplateSummary[]>;
  /** Eine eigene Vorlage mit Versionsverlauf und den Übungen der neuesten Version */
  template(id: string): Promise<AgentTemplate | null>;
  /** Alle Übungen, die die Person verwenden kann (Katalog und eigene) */
  exercises(): Promise<AgentExercise[]>;
  /** Legt eine Vorlage an oder speichert eine neue Version. Gibt die ID der Vorlage zurück. */
  saveTemplate(input: AgentTemplateInput): Promise<string>;
};

export type AgentExercise = {
  id: string;
  name: string;
  muscleGroup: string | null;
  measure: ExerciseMeasure;
  aliases: string[];
};

export type AgentTemplateSummary = {
  id: string;
  name: string;
  visibility: TemplateVisibility;
  updatedAt: string;
  versionNumber: number;
  exerciseCount: number;
};

export type AgentTemplate = {
  id: string;
  name: string;
  visibility: TemplateVisibility;
  versions: { number: number; note: string | null; source: string; createdAt: string }[];
  exercises: StoredTemplateExercise[];
};

/** templateId null: neue Vorlage */
export type AgentTemplateInput = {
  templateId: string | null;
  name: string;
  note: string;
  exercises: TemplateExercisePayload[];
};

/** Übung, wie eine KI sie beim Anlegen oder Ändern einer Vorlage angibt. */
export type AgentExerciseInput = {
  exercise_id: string;
  sets: number;
  reps?: number;
  weight_kg?: number;
  duration_seconds?: number;
  distance_m?: number;
};

export type AgentWorkout = {
  performedAt: string;
  title: string | null;
  sportName: string;
  durationMinutes: number | null;
  distanceM: number | null;
  elevationM: number | null;
  feeling: number | null;
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

function distanceText(meters: number) {
  const { value, unit } = formatDistance(meters);
  return plain(`${value} ${unit}`);
}

/**
 * Aktivitäten mit Sportart und Angaben, bei Krafttraining mit Sätzen je Übung, neueste zuerst,
 * nur ab dem ersten Tag des Zeitraums. Fehlende Angaben werden weggelassen.
 */
export function describeWorkouts(workouts: readonly AgentWorkout[], fromDay: string) {
  return workouts
    .filter((w) => dayKey(new Date(w.performedAt)) >= fromDay)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
    .map((w) => ({
      datum: dateFormat.format(new Date(w.performedAt)),
      sportart: w.sportName,
      titel: w.title,
      ...(w.durationMinutes ? { dauer: plain(formatActivityDuration(w.durationMinutes)) } : {}),
      ...(w.distanceM ? { distanz: distanceText(w.distanceM) } : {}),
      ...(w.elevationM !== null ? { hoehenmeter: w.elevationM } : {}),
      ...(w.feeling ? { anstrengung: FEELING_LABEL[w.feeling] } : {}),
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

// ---------- Vorlagen ----------

const MEASURE_LABEL: Record<ExerciseMeasure, string> = {
  weight_reps: "Wiederholungen und Gewicht",
  duration: "Dauer in Sekunden",
  distance: "Strecke in Metern",
};

const dayFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Übungen der KI in die Nutzlast für save_template übersetzen. */
export function toTemplatePayload(exercises: readonly AgentExerciseInput[]): TemplateExercisePayload[] {
  return exercises.map((e) => ({
    exercise_id: e.exercise_id,
    target_sets: e.sets,
    ...(e.reps !== undefined ? { target_reps: e.reps } : {}),
    ...(e.weight_kg !== undefined ? { target_weight_kg: e.weight_kg } : {}),
    ...(e.duration_seconds !== undefined ? { target_duration_seconds: e.duration_seconds } : {}),
    ...(e.distance_m !== undefined ? { target_distance_m: e.distance_m } : {}),
  }));
}

export function describeTemplateList(templates: readonly AgentTemplateSummary[]) {
  return templates.map((t) => ({
    template_id: t.id,
    name: t.name,
    sichtbarkeit: t.visibility === "public" ? "öffentlich" : "privat",
    aktuelleVersion: t.versionNumber,
    uebungen: t.exerciseCount,
    geaendert: dayFormat.format(new Date(t.updatedAt)),
  }));
}

export function describeTemplate(template: AgentTemplate) {
  return {
    template_id: template.id,
    name: template.name,
    sichtbarkeit: template.visibility === "public" ? "öffentlich" : "privat",
    aktuelleVersion: template.versions[0]?.number ?? 1,
    versionen: template.versions.map((v) => ({
      version: v.number,
      datum: dayFormat.format(new Date(v.createdAt)),
      von: v.source === "ai" ? "KI" : "App",
      notiz: v.note,
    })),
    uebungen: template.exercises.map((e) => ({
      exercise_id: e.exerciseId,
      name: e.exerciseName,
      messart: MEASURE_LABEL[e.measure],
      ziel: plain(formatTemplateTarget(e)),
      sets: e.targetSets,
      reps: e.targetReps,
      weight_kg: e.targetWeightKg,
      duration_seconds: e.targetDurationSeconds,
      distance_m: e.targetDistanceM,
    })),
  };
}

/** Übungssuche für die KI, mit IDs zum Anlegen von Vorlagen. */
export function describeExerciseSearch(exercises: readonly AgentExercise[], query: string, limit = 15) {
  return searchExercises(exercises, query, limit).map((e) => ({
    exercise_id: e.id,
    name: e.name,
    muskelgruppe: e.muscleGroup,
    messart: MEASURE_LABEL[e.measure],
  }));
}
