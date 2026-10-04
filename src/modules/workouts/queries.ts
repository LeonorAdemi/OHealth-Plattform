import "server-only";

import { toExerciseMeasure } from "@/lib/domain";
import type { AgentClient } from "@/lib/supabase/agent";
import { getGroupMembers, getProfileForAgent, requireUser } from "@/modules/core/queries";

import type { AgentDataSource } from "./agent";

import {
  buildBestRanking,
  buildLeaderboard,
  weekKeys,
  type BestRow,
  type StoredSet,
} from "./logic";

/** Eigene Trainingstage der laufenden Woche als "JJJJ-MM-TT". */
export async function getMyTrainingDays(now: Date) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("v_training_days")
    .select("day")
    .eq("user_id", userId)
    .gte("day", weekKeys(now)[0])
    .limit(7);

  if (error) throw new Error("Trainingstage konnten nicht geladen werden.");
  // Spalten einer View gelten in den generierten Typen als möglicherweise leer.
  return data.flatMap((row) => (row.day ? [row.day] : []));
}

/** Konstanz-Rangliste einer Gruppe für die laufende Woche. */
export async function getLeaderboard(groupId: string, now: Date) {
  const { supabase, userId } = await requireUser();
  const members = await getGroupMembers(groupId);
  if (members.length === 0) return [];

  const { data, error } = await supabase
    .from("v_training_days")
    .select("user_id, day")
    .in(
      "user_id",
      members.map((m) => m.userId),
    )
    .gte("day", weekKeys(now)[0])
    .limit(members.length * 7);

  if (error) throw new Error("Die Rangliste konnte nicht geladen werden.");

  return buildLeaderboard(
    members,
    data.flatMap((row) => (row.user_id && row.day ? [{ userId: row.user_id, day: row.day }] : [])),
    userId,
    now,
  );
}

/** Die letzten eigenen Workouts mit ihren Sätzen. */
export async function getRecentWorkouts(limit = 20) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("workouts")
    .select(
      "id, title, performed_at, workout_sets(set_number, reps, duration_seconds, distance_m, weight_kg, exercises(name))",
    )
    .eq("user_id", userId)
    .order("performed_at", { ascending: false })
    .order("position", { referencedTable: "workout_sets" })
    .limit(limit);

  if (error) throw new Error("Workouts konnten nicht geladen werden.");
  return data;
}

/**
 * Bestwerte je Übung für eine Gruppe: welche Übungen es gibt (mit Zahl der Mitglieder,
 * die sie geloggt haben) und die Rangliste der gewählten Übung.
 * Sichtbar ist nur, was die Zugriffsregeln erlauben: In Coaching-Gruppen sehen
 * Mitglieder hier nur sich selbst.
 */
export async function getGroupBests(groupId: string, selectedExerciseId?: string) {
  const { supabase, userId } = await requireUser();
  const members = await getGroupMembers(groupId);
  if (members.length === 0) return { exercises: [], selected: null, ranking: [] };

  const { data: bests, error } = await supabase
    .from("v_exercise_bests")
    .select(
      "user_id, exercise_id, best_e1rm_kg, max_weight_kg, max_reps, max_duration_seconds, total_distance_m",
    )
    .in(
      "user_id",
      members.map((m) => m.userId),
    )
    .limit(2000);
  if (error) throw new Error("Die Bestwerte konnten nicht geladen werden.");

  const byExercise = new Map<string, BestRow[]>();
  for (const row of bests) {
    if (!row.user_id || !row.exercise_id) continue;
    const list = byExercise.get(row.exercise_id) ?? [];
    list.push({
      userId: row.user_id,
      bestE1rmKg: row.best_e1rm_kg,
      maxWeightKg: row.max_weight_kg,
      maxReps: row.max_reps,
      maxDurationSeconds: row.max_duration_seconds,
      totalDistanceM: row.total_distance_m,
    });
    byExercise.set(row.exercise_id, list);
  }
  if (byExercise.size === 0) return { exercises: [], selected: null, ranking: [] };

  const { data: names, error: namesError } = await supabase
    .from("exercises")
    .select("id, name, measure")
    .in("id", Array.from(byExercise.keys()));
  if (namesError) throw new Error("Die Übungen konnten nicht geladen werden.");

  // Übungen mit den meisten Teilnehmern zuerst, damit der Vergleich etwas hergibt.
  const exercises = names
    .map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      measure: toExerciseMeasure(exercise.measure),
      participants: byExercise.get(exercise.id)?.length ?? 0,
    }))
    .sort((a, b) => b.participants - a.participants || a.name.localeCompare(b.name, "de"));

  const selected = exercises.find((e) => e.id === selectedExerciseId) ?? exercises[0] ?? null;
  const ranking = selected
    ? buildBestRanking(members, byExercise.get(selected.id) ?? [], selected.measure, userId)
    : [];

  return { exercises, selected, ranking };
}

/** Ein eigenes Workout mit seinen Sätzen in gespeicherter Reihenfolge. null, wenn es nicht existiert. */
export async function getWorkout(id: string) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("workouts")
    .select(
      "id, title, performed_at, workout_sets(reps, duration_seconds, distance_m, weight_kg, position, exercises(id, name, measure))",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .order("position", { referencedTable: "workout_sets" })
    .maybeSingle();

  if (error) throw new Error("Das Workout konnte nicht geladen werden.");
  if (!data) return null;

  const sets: StoredSet[] = data.workout_sets.flatMap((row) =>
    row.exercises
      ? [
          {
            exerciseId: row.exercises.id,
            exerciseName: row.exercises.name,
            measure: toExerciseMeasure(row.exercises.measure),
            reps: row.reps,
            durationSeconds: row.duration_seconds,
            distanceM: row.distance_m,
            weightKg: row.weight_kg,
          },
        ]
      : [],
  );

  return { id: data.id, title: data.title, performedAt: data.performed_at, sets };
}

// ---------- KI-Zugriff über MCP ----------

/**
 * Datenquelle für den MCP-Server. Alle Abfragen laufen mit dem Token der KI, die Datenbank
 * lässt damit nur eigene Daten zu (Migration agent_read_only). Die Filter auf userId
 * stehen trotzdem da, damit Abfragen schnell bleiben und die Absicht lesbar ist.
 */
export function createAgentDataSource(supabase: AgentClient, userId: string): AgentDataSource {
  return {
    profile: () => getProfileForAgent(supabase, userId),

    async workoutCount() {
      const { count, error } = await supabase
        .from("workouts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw new Error("Workouts konnten nicht gezählt werden.");
      return count ?? 0;
    },

    async workoutsSince(since, limit) {
      const { data, error } = await supabase
        .from("workouts")
        .select(
          "performed_at, title, workout_sets(reps, duration_seconds, distance_m, weight_kg, position, exercises(id, name, measure, muscle_group))",
        )
        .eq("user_id", userId)
        .gte("performed_at", since.toISOString())
        .order("performed_at", { ascending: false })
        .order("position", { referencedTable: "workout_sets" })
        .limit(limit);
      if (error) throw new Error("Workouts konnten nicht geladen werden.");

      return data.map((w) => ({
        performedAt: w.performed_at,
        title: w.title,
        sets: w.workout_sets.flatMap((row) =>
          row.exercises
            ? [
                {
                  exerciseId: row.exercises.id,
                  exerciseName: row.exercises.name,
                  measure: toExerciseMeasure(row.exercises.measure),
                  muscleGroup: row.exercises.muscle_group,
                  reps: row.reps,
                  durationSeconds: row.duration_seconds,
                  distanceM: row.distance_m,
                  weightKg: row.weight_kg,
                },
              ]
            : [],
        ),
      }));
    },

    async trainingDaysSince(day) {
      const { data, error } = await supabase
        .from("v_training_days")
        .select("day")
        .eq("user_id", userId)
        .gte("day", day)
        .limit(400);
      if (error) throw new Error("Trainingstage konnten nicht geladen werden.");
      return data.flatMap((row) => (row.day ? [row.day] : []));
    },

    async bests() {
      const { data, error } = await supabase
        .from("v_exercise_bests")
        .select(
          "best_e1rm_kg, max_weight_kg, max_reps, max_duration_seconds, total_distance_m, exercises(name, measure, muscle_group)",
        )
        .eq("user_id", userId)
        .limit(500);
      if (error) throw new Error("Die Bestwerte konnten nicht geladen werden.");

      return data.flatMap((row) =>
        row.exercises
          ? [
              {
                exerciseName: row.exercises.name,
                muscleGroup: row.exercises.muscle_group,
                measure: toExerciseMeasure(row.exercises.measure),
                bestE1rmKg: row.best_e1rm_kg,
                maxWeightKg: row.max_weight_kg,
                maxReps: row.max_reps,
                maxDurationSeconds: row.max_duration_seconds,
                totalDistanceM: row.total_distance_m,
              },
            ]
          : [],
      );
    },
  };
}
