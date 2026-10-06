import "server-only";

import { toExerciseMeasure } from "@/lib/domain";
import type { AgentClient } from "@/lib/supabase/agent";
import { toSportCategory } from "@/modules/core/logic";
import { getGroupMembers, getProfileForAgent, requireUser } from "@/modules/core/queries";

import type { AgentDataSource } from "./agent";

import {
  buildBestRanking,
  buildLeaderboard,
  lastDurationBySport,
  toTemplateVisibility,
  weekKeys,
  type ActivityDay,
  type BestRow,
  type WeekSport,
  type WeekSummary,
  type ExerciseSessionRow,
  type StoredSet,
  type StoredTemplateExercise,
} from "./logic";

/** Gruppe der Sportart aus einem eingebetteten Katalogeintrag, ohne Sportart null. */
function sportCategoryOf(sport: { category: string } | null | undefined) {
  return sport ? toSportCategory(sport.category) : null;
}

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

/** Die letzten eigenen Aktivitäten mit Sportart und Sätzen. */
export async function getRecentWorkouts(limit = 20) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("workouts")
    .select(
      "id, title, performed_at, started_at, finished_at, duration_minutes, distance_m, elevation_m, sports(name, category), workout_sets(set_number, reps, duration_seconds, distance_m, weight_kg, exercises(name))",
    )
    .eq("user_id", userId)
    .order("performed_at", { ascending: false })
    .order("position", { referencedTable: "workout_sets" })
    .limit(limit);

  if (error) throw new Error("Aktivitäten konnten nicht geladen werden.");
  return data.map((w) => ({ ...w, sportName: w.sports?.name ?? "Aktivität", sportCategory: sportCategoryOf(w.sports) }));
}

/** Die zuletzt genutzten eigenen Sportarten, neueste zuerst, ohne Doppelte. */
export async function getMyRecentSportIds(limit = 6) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("workouts")
    .select("sport_id")
    .eq("user_id", userId)
    .order("performed_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return [...new Set(data.map((w) => w.sport_id))].slice(0, limit);
}

/**
 * Für „Schnell eintragen“: zuletzt genutzte Sportarten und je Sportart die Dauer der jüngsten
 * Aktivität, aus den letzten 50 Aktivitäten.
 */
export async function getMyRecentSportDurations(limit = 6) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("workouts")
    .select("sport_id, duration_minutes")
    .eq("user_id", userId)
    .order("performed_at", { ascending: false })
    .limit(50);
  if (error) return { sportIds: [], lastDurations: {} };
  const rows = data.map((w) => ({ sportId: w.sport_id, durationMinutes: w.duration_minutes }));
  return {
    sportIds: [...new Set(rows.map((r) => r.sportId))].slice(0, limit),
    lastDurations: lastDurationBySport(rows),
  };
}

/** Eigene Aktivitäten in einem Zeitraum, für den Wochenplan. */
export async function getMyWorkoutsBetween(from: Date, to: Date) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("workouts")
    .select("id, title, performed_at, duration_minutes, distance_m, meetup_id, sports(name, category), workout_sets(count)")
    .eq("user_id", userId)
    .gte("performed_at", from.toISOString())
    .lt("performed_at", to.toISOString())
    .order("performed_at")
    .limit(100);

  if (error) throw new Error("Aktivitäten konnten nicht geladen werden.");
  return data.map((w) => ({
    id: w.id,
    title: w.title,
    performedAt: w.performed_at,
    sportName: w.sports?.name ?? "Aktivität",
    sportCategory: sportCategoryOf(w.sports),
    durationMinutes: w.duration_minutes,
    distanceM: w.distance_m,
    meetupId: w.meetup_id,
    setCount: w.workout_sets[0]?.count ?? 0,
  }));
}

// ---------- Öffentliche Community ----------
// Mitglieder sehen hier nur Namen, Trainingstage und Bestwerte der anderen, keine Workouts.
// Beides liefern Datenbankfunktionen, die nur Mitgliedern antworten (Migration 0012).

/** Konstanz-Rangliste einer öffentlichen Community für die laufende Woche. */
export async function getCommunityLeaderboard(groupId: string, now: Date) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.rpc("community_training_days", {
    gid: groupId,
    from_day: weekKeys(now)[0],
  });
  if (error) throw new Error("Die Rangliste konnte nicht geladen werden.");

  const members = new Map<string, string>();
  const days: { userId: string; day: string }[] = [];
  for (const row of data) {
    members.set(row.user_id, row.display_name);
    if (row.day) days.push({ userId: row.user_id, day: row.day });
  }
  return buildLeaderboard(
    Array.from(members, ([memberId, name]) => ({ userId: memberId, name })),
    days,
    userId,
    now,
  );
}

/** Bestwerte je Übung in einer öffentlichen Community, nach denselben Regeln wie in Gruppen. */
export async function getCommunityBests(groupId: string, selectedExerciseId?: string) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.rpc("community_bests", { gid: groupId });
  if (error) throw new Error("Die Bestwerte konnten nicht geladen werden.");

  const members = new Map<string, string>();
  const byExercise = new Map<string, BestRow[]>();
  for (const row of data) {
    members.set(row.user_id, row.display_name);
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

  // Eigene Übungen anderer Mitglieder sind nicht sichtbar und fallen hier weg.
  const { data: names, error: namesError } = await supabase
    .from("exercises")
    .select("id, name, measure")
    .in("id", Array.from(byExercise.keys()))
    .limit(500);
  if (namesError) throw new Error("Die Übungen konnten nicht geladen werden.");

  const exercises = names
    .map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      measure: toExerciseMeasure(exercise.measure),
      participants: byExercise.get(exercise.id)?.length ?? 0,
    }))
    .sort((a, b) => b.participants - a.participants || a.name.localeCompare(b.name, "de"));

  const selected = exercises.find((e) => e.id === selectedExerciseId) ?? exercises[0] ?? null;
  const memberList = Array.from(members, ([memberId, name]) => ({ userId: memberId, name }));
  const ranking = selected
    ? buildBestRanking(memberList, byExercise.get(selected.id) ?? [], selected.measure, userId)
    : [];

  return { exercises, selected, ranking };
}

/**
 * Die letzten Workouts der Mitglieder einer Gruppe, neueste zuerst. Sichtbar ist nur, was die
 * Zugriffsregeln erlauben: In Freundesgruppen alle Mitglieder, in Coaching-Gruppen nur der
 * Coach alle, in Communities niemand (dort gibt es nur die Rangliste).
 */
export async function getGroupActivity(groupId: string, limit = 10) {
  const { supabase, userId } = await requireUser();
  const members = await getGroupMembers(groupId);
  if (members.length === 0) return [];
  const names = new Map(members.map((m) => [m.userId, m.name]));

  const { data, error } = await supabase
    .from("workouts")
    .select("id, user_id, title, performed_at, started_at, finished_at, duration_minutes, distance_m, sports(name, category), workout_sets(count)")
    .in("user_id", members.map((m) => m.userId))
    .order("performed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error("Die Aktivität der Gruppe konnte nicht geladen werden.");
  return data.map((workout) => ({
    id: workout.id,
    isMe: workout.user_id === userId,
    name: names.get(workout.user_id) ?? "Unbekannt",
    title: workout.title,
    sportName: workout.sports?.name ?? "Aktivität",
    sportCategory: sportCategoryOf(workout.sports),
    performedAt: workout.performed_at,
    startedAt: workout.started_at,
    finishedAt: workout.finished_at,
    durationMinutes: workout.duration_minutes,
    distanceM: workout.distance_m,
    setCount: workout.workout_sets[0]?.count ?? 0,
  }));
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

/** Eine eigene Aktivität mit Angaben und Sätzen in gespeicherter Reihenfolge. null, wenn es sie nicht gibt. */
export async function getWorkout(id: string) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("workouts")
    .select(
      "id, title, performed_at, started_at, finished_at, sport_id, duration_minutes, distance_m, elevation_m, feeling, notes, sports(name, has_sets), workout_sets(reps, duration_seconds, distance_m, weight_kg, rest_seconds, position, exercises(id, name, measure))",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .order("position", { referencedTable: "workout_sets" })
    .maybeSingle();

  if (error) throw new Error("Die Aktivität konnte nicht geladen werden.");
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
            restSeconds: row.rest_seconds,
          },
        ]
      : [],
  );

  return {
    id: data.id,
    title: data.title,
    performedAt: data.performed_at,
    startedAt: data.started_at,
    finishedAt: data.finished_at,
    sportId: data.sport_id,
    sportName: data.sports?.name ?? "Aktivität",
    sportHasSets: data.sports?.has_sets ?? false,
    durationMinutes: data.duration_minutes,
    distanceM: data.distance_m,
    elevationM: data.elevation_m,
    feeling: data.feeling,
    notes: data.notes,
    sets,
  };
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
      if (error) throw new Error("Aktivitäten konnten nicht gezählt werden.");
      return count ?? 0;
    },

    async workoutsSince(since, limit) {
      const { data, error } = await supabase
        .from("workouts")
        .select(
          "performed_at, title, duration_minutes, distance_m, elevation_m, feeling, sports(name), workout_sets(reps, duration_seconds, distance_m, weight_kg, position, exercises(id, name, measure, muscle_group))",
        )
        .eq("user_id", userId)
        .gte("performed_at", since.toISOString())
        .order("performed_at", { ascending: false })
        .order("position", { referencedTable: "workout_sets" })
        .limit(limit);
      if (error) throw new Error("Aktivitäten konnten nicht geladen werden.");

      return data.map((w) => ({
        performedAt: w.performed_at,
        title: w.title,
        sportName: w.sports?.name ?? "Aktivität",
        durationMinutes: w.duration_minutes,
        distanceM: w.distance_m,
        elevationM: w.elevation_m,
        feeling: w.feeling,
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

    async templates() {
      const { data, error } = await supabase
        .from("workout_templates")
        .select("id, name, visibility, updated_at, template_versions(version_number, template_version_exercises(count))")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .order("version_number", { referencedTable: "template_versions", ascending: false })
        .limit(1, { referencedTable: "template_versions" })
        .limit(50);
      if (error) throw new Error("Vorlagen konnten nicht geladen werden.");
      return data.map((t) => ({
        id: t.id,
        name: t.name,
        visibility: toTemplateVisibility(t.visibility),
        updatedAt: t.updated_at,
        versionNumber: t.template_versions[0]?.version_number ?? 1,
        exerciseCount: t.template_versions[0]?.template_version_exercises[0]?.count ?? 0,
      }));
    },

    async template(id) {
      const { data: template, error } = await supabase
        .from("workout_templates")
        .select("id, name, visibility, template_versions(id, version_number, note, source, created_at)")
        .eq("id", id)
        .eq("user_id", userId)
        .order("version_number", { referencedTable: "template_versions", ascending: false })
        .limit(100, { referencedTable: "template_versions" })
        .maybeSingle();
      if (error) throw new Error("Die Vorlage konnte nicht geladen werden.");
      const latest = template?.template_versions[0];
      if (!template || !latest) return null;

      const { data: rows, error: rowsError } = await supabase
        .from("template_version_exercises")
        .select(
          "exercise_id, target_sets, target_reps, target_weight_kg, target_duration_seconds, target_distance_m, exercises(name, measure)",
        )
        .eq("version_id", latest.id)
        .order("position")
        .limit(30);
      if (rowsError) throw new Error("Die Übungen der Vorlage konnten nicht geladen werden.");

      return {
        id: template.id,
        name: template.name,
        visibility: toTemplateVisibility(template.visibility),
        versions: template.template_versions.map((v) => ({
          number: v.version_number,
          note: v.note,
          source: v.source,
          createdAt: v.created_at,
        })),
        exercises: rows.map((row) => ({
          exerciseId: row.exercise_id,
          exerciseName: row.exercises?.name ?? "Übung",
          measure: toExerciseMeasure(row.exercises?.measure ?? "weight_reps"),
          targetSets: row.target_sets,
          targetReps: row.target_reps,
          targetWeightKg: row.target_weight_kg,
          targetDurationSeconds: row.target_duration_seconds,
          targetDistanceM: row.target_distance_m,
        })),
      };
    },

    async exercises() {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name, measure, muscle_group, aliases")
        .order("name")
        .limit(500);
      if (error) throw new Error("Übungen konnten nicht geladen werden.");
      return data.map((e) => ({
        id: e.id,
        name: e.name,
        measure: toExerciseMeasure(e.measure),
        muscleGroup: e.muscle_group,
        aliases: e.aliases,
      }));
    },

    async saveTemplate(input) {
      // Die Datenbank legt für eine KI nur private Vorlagen an und lässt die Sichtbarkeit
      // bestehender Vorlagen unverändert (Migration agent_write_templates).
      const { data, error } = await supabase.rpc("save_template", {
        p_template_id: input.templateId ?? crypto.randomUUID(),
        p_version_id: crypto.randomUUID(),
        p_name: input.name,
        p_visibility: "private",
        p_note: input.note,
        p_exercises: input.exercises,
      });
      if (error || !data) throw new Error(agentSaveError(error?.code, error?.message));
      return data;
    },
  };
}

// Verständliche Fehler für die KI. Eigene Meldungen der Datenbank werden durchgereicht,
// alles andere bleibt allgemein, damit keine Interna nach außen gehen.
const KNOWN_SAVE_ERRORS = [
  "Vorlage nicht gefunden",
  "Eine Vorlage braucht mindestens eine Übung",
  "Höchstens 30 Übungen je Vorlage",
  "Höchstens 50 Vorlagen je Person",
  "Höchstens 100 Versionen je Vorlage",
];

function agentSaveError(code?: string, message?: string): string {
  if (code === "23503") return "Eine der Übungen gibt es nicht. Hol die exercise_id mit search_exercises.";
  if (code === "23505") return "Vorlage nicht gefunden. Hol die template_id mit list_templates.";
  if (code === "23514") return "Ein Wert liegt außerhalb des erlaubten Bereichs (Name 1 bis 60 Zeichen, 1 bis 20 Sätze, Werte größer als 0).";
  const known = KNOWN_SAVE_ERRORS.find((text) => message?.includes(text));
  return known ?? "Speichern fehlgeschlagen.";
}

// ---------- Vorlagen ----------

const TEMPLATE_LIST_LIMIT = 50;
const VERSION_LIST_LIMIT = 100;

/** Eigene Vorlagen, zuletzt geänderte zuerst, mit Nummer der neuesten Version und Zahl der Übungen. */
export async function getMyTemplates() {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("workout_templates")
    .select(
      "id, name, visibility, updated_at, template_versions(version_number, template_version_exercises(count))",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .order("version_number", { referencedTable: "template_versions", ascending: false })
    .limit(1, { referencedTable: "template_versions" })
    .limit(TEMPLATE_LIST_LIMIT);

  if (error) throw new Error("Vorlagen konnten nicht geladen werden.");
  return data.map((template) => {
    const latest = template.template_versions[0];
    return {
      id: template.id,
      name: template.name,
      visibility: toTemplateVisibility(template.visibility),
      updatedAt: template.updated_at,
      versionNumber: latest?.version_number ?? 1,
      exerciseCount: latest?.template_version_exercises[0]?.count ?? 0,
    };
  });
}

/** Öffentliche Vorlagen anderer Personen mit dem Namen der Autorin oder des Autors. */
export async function getPublicTemplates() {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("workout_templates")
    .select(
      "id, name, updated_at, profiles(display_name), template_versions(version_number, template_version_exercises(count))",
    )
    .eq("visibility", "public")
    .neq("user_id", userId)
    .order("updated_at", { ascending: false })
    .order("version_number", { referencedTable: "template_versions", ascending: false })
    .limit(1, { referencedTable: "template_versions" })
    .limit(TEMPLATE_LIST_LIMIT);

  if (error) throw new Error("Öffentliche Vorlagen konnten nicht geladen werden.");
  return data.map((template) => {
    const latest = template.template_versions[0];
    return {
      id: template.id,
      name: template.name,
      authorName: template.profiles?.display_name ?? "Unbekannt",
      updatedAt: template.updated_at,
      exerciseCount: latest?.template_version_exercises[0]?.count ?? 0,
    };
  });
}

/**
 * Eine Vorlage mit Versionsverlauf und den Übungen einer Version (Standard: die neueste).
 * Null, wenn es die Vorlage oder die Version nicht gibt oder man sie nicht sehen darf.
 */
export async function getTemplate(id: string, versionNumber?: number) {
  const { supabase, userId } = await requireUser();
  const { data: template, error } = await supabase
    .from("workout_templates")
    .select(
      "id, name, visibility, user_id, copied_from, updated_at, profiles(display_name), template_versions(id, version_number, note, source, created_at)",
    )
    .eq("id", id)
    .order("version_number", { referencedTable: "template_versions", ascending: false })
    .limit(VERSION_LIST_LIMIT, { referencedTable: "template_versions" })
    .maybeSingle();

  if (error) throw new Error("Die Vorlage konnte nicht geladen werden.");
  if (!template) return null;

  const versions = template.template_versions;
  const latest = versions[0];
  const selected = versionNumber === undefined
    ? latest
    : versions.find((version) => version.version_number === versionNumber);
  if (!latest || !selected) return null;

  const { data: rows, error: exercisesError } = await supabase
    .from("template_version_exercises")
    .select(
      "exercise_id, target_sets, target_reps, target_weight_kg, target_duration_seconds, target_distance_m, exercises(name, measure)",
    )
    .eq("version_id", selected.id)
    .order("position")
    .limit(30);

  if (exercisesError) throw new Error("Die Übungen der Vorlage konnten nicht geladen werden.");

  const exercises: StoredTemplateExercise[] = rows.map((row) => ({
    exerciseId: row.exercise_id,
    exerciseName: row.exercises?.name ?? "Übung",
    measure: toExerciseMeasure(row.exercises?.measure ?? "weight_reps"),
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    targetWeightKg: row.target_weight_kg,
    targetDurationSeconds: row.target_duration_seconds,
    targetDistanceM: row.target_distance_m,
  }));

  return {
    id: template.id,
    name: template.name,
    visibility: toTemplateVisibility(template.visibility),
    isMine: template.user_id === userId,
    authorName: template.profiles?.display_name ?? "Unbekannt",
    isCopy: template.copied_from !== null,
    updatedAt: template.updated_at,
    versions: versions.map((version) => ({
      number: version.version_number,
      note: version.note,
      source: version.source,
      createdAt: version.created_at,
    })),
    latestNumber: latest.version_number,
    latestVersionId: latest.id,
    selectedNumber: selected.version_number,
    exercises,
  };
}

// ---------- Training und Verlauf ----------

export type LastExerciseSets = { performedAt: string; sets: StoredSet[] };

/**
 * Die Sätze vom letzten eigenen Workout je Übung, für "Zuletzt" und die Vorbelegung.
 * Übungen ohne früheres Workout fehlen im Ergebnis.
 */
export async function getLastSets(exerciseIds: readonly string[]): Promise<Record<string, LastExerciseSets>> {
  const ids = [...new Set(exerciseIds)];
  if (ids.length === 0) return {};
  const { supabase, userId } = await requireUser();

  const { data: latest, error } = await supabase
    .from("v_exercise_last_sessions")
    .select("exercise_id, workout_id, performed_at")
    .eq("user_id", userId)
    .in("exercise_id", ids)
    .limit(ids.length);
  if (error) throw new Error("Die letzten Werte konnten nicht geladen werden.");

  const pairs = latest.flatMap((row) =>
    row.exercise_id && row.workout_id && row.performed_at
      ? [{ exerciseId: row.exercise_id, workoutId: row.workout_id, performedAt: row.performed_at }]
      : [],
  );
  if (pairs.length === 0) return {};

  const { data: rows, error: setsError } = await supabase
    .from("workout_sets")
    .select("workout_id, reps, duration_seconds, distance_m, weight_kg, exercises(id, name, measure)")
    .in("workout_id", [...new Set(pairs.map((pair) => pair.workoutId))])
    .in("exercise_id", pairs.map((pair) => pair.exerciseId))
    .order("position")
    .limit(ids.length * 40);
  if (setsError) throw new Error("Die letzten Werte konnten nicht geladen werden.");

  const result: Record<string, LastExerciseSets> = {};
  for (const pair of pairs) {
    const sets: StoredSet[] = rows.flatMap((row) =>
      row.workout_id === pair.workoutId && row.exercises?.id === pair.exerciseId
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
    if (sets.length > 0) result[pair.exerciseId] = { performedAt: pair.performedAt, sets };
  }
  return result;
}

/** Eine Übung mit dem eigenen Verlauf (neueste zuerst) und dem Bestwert. null, wenn es sie nicht gibt. */
export async function getExerciseHistory(exerciseId: string) {
  const { supabase, userId } = await requireUser();
  const [exercise, sessions, best] = await Promise.all([
    supabase.from("exercises").select("id, name, measure, muscle_group").eq("id", exerciseId).maybeSingle(),
    supabase
      .from("v_exercise_sessions")
      .select("workout_id, performed_at, set_count, max_weight_kg, total_reps, best_e1rm_kg, max_duration_seconds, total_distance_m")
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId)
      .order("performed_at", { ascending: false })
      .limit(50),
    supabase
      .from("v_exercise_bests")
      .select("max_weight_kg, best_e1rm_kg, max_reps, max_duration_seconds, total_distance_m")
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId)
      .maybeSingle(),
  ]);

  if (exercise.error || sessions.error || best.error) {
    throw new Error("Der Verlauf konnte nicht geladen werden.");
  }
  if (!exercise.data) return null;

  const rows: ExerciseSessionRow[] = sessions.data.flatMap((row) =>
    row.workout_id && row.performed_at
      ? [
          {
            workoutId: row.workout_id,
            performedAt: row.performed_at,
            setCount: row.set_count ?? 0,
            maxWeightKg: row.max_weight_kg,
            totalReps: row.total_reps,
            bestE1rmKg: row.best_e1rm_kg,
            maxDurationSeconds: row.max_duration_seconds,
            totalDistanceM: row.total_distance_m,
          },
        ]
      : [],
  );

  return {
    id: exercise.data.id,
    name: exercise.data.name,
    measure: toExerciseMeasure(exercise.data.measure),
    sessions: rows,
    best: best.data
      ? {
          maxWeightKg: best.data.max_weight_kg,
          bestE1rmKg: best.data.best_e1rm_kg,
          maxReps: best.data.max_reps,
          maxDurationSeconds: best.data.max_duration_seconds,
          totalDistanceM: best.data.total_distance_m,
        }
      : null,
  };
}

// ---------- Wochenziel und Überblick („Heute“) ----------

/** Eigene Vorhaben je Sportart in ihrer Reihenfolge („Krafttraining 3× pro Woche“). */
export async function getSportGoals() {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("weekly_sport_goals")
    .select("sport_id, times")
    .eq("user_id", userId)
    .order("position")
    .limit(5);
  if (error) throw new Error("Die Vorhaben konnten nicht geladen werden.");
  return data.map((g) => ({ sportId: g.sport_id, times: g.times }));
}

/**
 * Laufende Woche je Sportart (my_week_sports): Vorhaben (ohne null) und Zahl der Aktivitäten,
 * zuerst die Vorhaben in ihrer Reihenfolge, dann Spontanes.
 */
export async function getWeekSports(): Promise<WeekSport[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("my_week_sports");
  if (error) throw new Error("Die Woche konnte nicht geladen werden.");
  return data.map((row) => ({
    sportId: row.sport_id,
    name: row.sport_name,
    category: toSportCategory(row.category),
    times: row.times,
    done: row.done,
  }));
}

/** Die letzten Wochen mit Trainingstagen, Minuten und Distanz, die laufende zuerst (my_weekly_summary). */
export async function getWeeklySummary(weeks: number): Promise<WeekSummary[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("my_weekly_summary", { p_weeks: weeks });
  if (error) throw new Error("Der Wochenüberblick konnte nicht geladen werden.");
  return data.map((row) => ({
    weekStart: row.week_start,
    trainingDays: row.training_days,
    minutes: row.minutes,
    distanceM: row.distance_m,
  }));
}

/** Eigene Trainingstage ab einem Tag ("JJJJ-MM-TT") mit Minuten und Gruppe der Hauptsportart. */
export async function getActivityDays(from: string): Promise<ActivityDay[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("my_activity_days", { p_from: from });
  if (error) throw new Error("Trainingstage konnten nicht geladen werden.");
  return data.map((row) => ({ day: row.day, minutes: row.minutes, category: toSportCategory(row.category) }));
}

/** Übungen mit neuem geschätztem Maximum seit einem Zeitpunkt (my_new_bests, höchstens fünf). */
export async function getNewBests(from: Date) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("my_new_bests", { p_from: from.toISOString() });
  if (error) throw new Error("Die Bestwerte konnten nicht geladen werden.");
  return data.map((row) => ({
    exerciseId: row.exercise_id,
    exercise: row.exercise_name,
    e1rm: Number(row.best_e1rm_kg),
    previous: Number(row.previous_e1rm_kg),
  }));
}
