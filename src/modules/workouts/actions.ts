"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState, Result } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { activityErrorMessage, BODY_WEIGHT_MAX, BODY_WEIGHT_MIN, parseBodyWeight } from "./logic";

const setSchema = z
  .object({
    exercise_id: z.uuid(),
    set_number: z.int().positive(),
    reps: z.int().positive().optional(),
    duration_seconds: z.int().positive().optional(),
    distance_m: z.number().positive().optional(),
    weight_kg: z.number().min(0).max(9999),
    rest_seconds: z.int().min(0).max(86400).optional(),
  })
  .refine(
    (s) => s.reps !== undefined || s.duration_seconds !== undefined || s.distance_m !== undefined,
    "Ein Satz braucht Wiederholungen, Dauer oder Distanz.",
  );

const workoutSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().max(80).optional(),
  sets: z.array(setSchema).min(1, "Trag mindestens einen Satz ein.").max(200),
});

/**
 * Speichert ein Workout mit allen Sätzen in einer Transaktion (log_workout).
 * Die ID vergibt der Client, damit ein wiederholter Versuch kein Duplikat erzeugt.
 */
export async function saveWorkout(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Die Eingabe ist ungültig." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("log_workout", {
    p_id: parsed.data.id,
    p_title: parsed.data.title ?? "",
    p_performed_at: new Date().toISOString(),
    p_sets: parsed.data.sets,
  });

  if (error || !data) {
    return {
      ok: false,
      error: "Speichern fehlgeschlagen. Prüf deine Verbindung und versuch es erneut.",
    };
  }

  revalidateWorkoutViews();
  return { ok: true, data: { id: data } };
}

const trainingSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().max(80).optional(),
    templateVersionId: z.uuid().nullable(),
    startedAt: z.iso.datetime(),
    finishedAt: z.iso.datetime(),
    sets: z.array(setSchema).min(1, "Hak mindestens einen Satz ab.").max(200),
  })
  .refine((t) => Date.parse(t.finishedAt) >= Date.parse(t.startedAt), "Start und Ende passen nicht zusammen.");

/**
 * Speichert ein Training aus einer Vorlage mit Start, Ende und Pausen (log_training).
 * Die ID vergibt der Client, damit ein wiederholter Versuch kein Duplikat erzeugt.
 * Zusätzliche Übungen und geänderte Werte bleiben im Workout, die Vorlage ändert sich nicht.
 */
export async function saveTraining(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = trainingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Die Eingabe ist ungültig." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("log_training", {
    p_id: parsed.data.id,
    p_title: parsed.data.title ?? "",
    // Ohne Vorlage gestartet: Die Datenbank erwartet dann null.
    p_template_version_id: parsed.data.templateVersionId as string,
    p_started_at: parsed.data.startedAt,
    p_finished_at: parsed.data.finishedAt,
    p_sets: parsed.data.sets,
  });

  if (error || !data) {
    return {
      ok: false,
      error: "Speichern fehlgeschlagen. Prüf deine Verbindung und versuch es erneut.",
    };
  }

  revalidateWorkoutViews();
  revalidatePath("/vorlagen", "layout");
  return { ok: true, data: { id: data } };
}

const activitySchema = z.object({
  id: z.uuid(),
  sportId: z.string().regex(/^[a-z0-9_]{2,30}$/, "Wähl eine Sportart."),
  performedAt: z.iso.datetime({ offset: true }),
  durationMinutes: z.int("Gib eine Dauer ein.").min(1, "Gib eine Dauer ein.").max(1440, "Höchstens 24 Stunden."),
  distanceM: z.number().positive().max(1_000_000).nullable(),
  elevationM: z.int().min(0).max(20_000).nullable(),
  feeling: z.int().min(1).max(5).nullable(),
  notes: z.string().trim().max(500, "Die Notiz darf höchstens 500 Zeichen haben.").nullable(),
});

function activityParams(a: z.infer<typeof activitySchema>) {
  return {
    p_id: a.id,
    p_sport_id: a.sportId,
    p_performed_at: a.performedAt,
    p_duration_minutes: a.durationMinutes,
    // Leere Angaben schickt die App als null; die Typen der Datenbankfunktion kennen dafür undefined.
    p_distance_m: a.distanceM ?? undefined,
    p_elevation_m: a.elevationM ?? undefined,
    p_feeling: a.feeling ?? undefined,
    p_notes: a.notes ?? undefined,
  };
}

/**
 * Trägt eine Aktivität mit Sportart und Dauer ein (log_activity). Die ID vergibt das Gerät, ein
 * wiederholter Versuch legt nichts doppelt an. Ob Distanz und Höhenmeter zur Sportart passen,
 * prüft die Datenbank.
 */
export async function saveActivity(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Die Eingabe ist ungültig." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("log_activity", activityParams(parsed.data));
  if (error || !data) return { ok: false, error: activityErrorMessage(error) };

  revalidateWorkoutViews();
  return { ok: true, data: { id: data } };
}

/** Ändert die Angaben einer eigenen Aktivität (update_activity). Sätze bleiben unberührt. */
export async function updateActivity(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Die Eingabe ist ungültig." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_activity", activityParams(parsed.data));
  // Ohne Fehler und ohne ID: Die Aktivität gehört jemand anderem oder ist schon gelöscht.
  if (!error && !data) return { ok: false, error: "Diese Aktivität gibt es nicht mehr." };
  if (error || !data) return { ok: false, error: activityErrorMessage(error) };

  revalidateWorkoutViews(data);
  return { ok: true, data: { id: data } };
}

function revalidateWorkoutViews(id?: string) {
  revalidatePath("/");
  revalidatePath("/verlauf");
  revalidatePath("/community", "layout");
  if (id) revalidatePath(`/aktivitaet/${id}`);
}

/**
 * Ersetzt Titel und Sätze eines eigenen Workouts in einer Transaktion (update_workout).
 * Die Datenbank lässt nur das eigene Workout zu. Derselbe Aufruf darf gefahrlos wiederholt werden.
 */
export async function updateWorkout(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Die Eingabe ist ungültig." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_workout", {
    p_id: parsed.data.id,
    p_title: parsed.data.title ?? "",
    p_sets: parsed.data.sets,
  });

  if (error || !data) {
    return {
      ok: false,
      error: "Speichern fehlgeschlagen. Prüf deine Verbindung und versuch es erneut.",
    };
  }

  revalidateWorkoutViews(data);
  return { ok: true, data: { id: data } };
}

/** Löscht ein eigenes Workout samt Sätzen. Fremde Workouts lässt die Datenbank nicht zu. */
export async function deleteWorkout(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Diese Aktivität gibt es nicht mehr." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("workouts").delete().eq("id", id.data).select("id");

  if (error) return { error: "Löschen fehlgeschlagen. Prüf deine Verbindung und versuch es erneut." };
  if (data.length === 0) return { error: "Diese Aktivität gibt es nicht mehr." };

  revalidateWorkoutViews();
  redirect("/verlauf");
}

// ---------- Vorlagen ----------

const templateExerciseSchema = z.object({
  exercise_id: z.uuid(),
  target_sets: z.int().min(1).max(20),
  target_reps: z.int().positive().optional(),
  target_weight_kg: z.number().min(0).max(9999).optional(),
  target_duration_seconds: z.int().positive().optional(),
  target_distance_m: z.number().positive().optional(),
});

const templateSchema = z.object({
  templateId: z.uuid().optional(),
  versionId: z.uuid(),
  name: z.string().trim().min(1, "Gib der Vorlage einen Namen.").max(60, "Der Name darf höchstens 60 Zeichen haben."),
  visibility: z.enum(["private", "public"]),
  note: z.string().trim().max(200).optional(),
  exercises: z.array(templateExerciseSchema).min(1, "Füg mindestens eine Übung hinzu.").max(30),
});

const SAVE_FAILED = "Speichern fehlgeschlagen. Prüf deine Verbindung und versuch es erneut.";

function revalidateTemplateViews(id?: string) {
  revalidatePath("/vorlagen");
  if (id) revalidatePath(`/vorlagen/${id}`);
}

/**
 * Legt eine Vorlage an oder speichert eine Änderung als neue Version (save_template).
 * Die IDs vergibt der Client, damit ein wiederholter Versuch nichts doppelt anlegt.
 */
export async function saveTemplate(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Die Eingabe ist ungültig." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_template", {
    p_template_id: parsed.data.templateId ?? crypto.randomUUID(),
    p_version_id: parsed.data.versionId,
    p_name: parsed.data.name,
    p_visibility: parsed.data.visibility,
    p_note: parsed.data.note ?? "",
    p_exercises: parsed.data.exercises,
  });

  if (error || !data) return { ok: false, error: SAVE_FAILED };

  revalidateTemplateViews(data);
  return { ok: true, data: { id: data } };
}

/** Kopiert eine eigene oder öffentliche Vorlage als neue, private Vorlage (copy_template). */
export async function copyTemplate(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = z.object({ sourceId: z.uuid(), newId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Diese Vorlage gibt es nicht mehr." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("copy_template", {
    p_source_id: parsed.data.sourceId,
    p_new_id: parsed.data.newId,
  });

  if (error || !data) {
    return { ok: false, error: "Kopieren fehlgeschlagen. Prüf deine Verbindung und versuch es erneut." };
  }

  revalidateTemplateViews();
  return { ok: true, data: { id: data } };
}

/** Stellt eine eigene Vorlage auf privat oder öffentlich. Fremde Vorlagen lässt die Datenbank nicht zu. */
export async function setTemplateVisibility(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ id: z.uuid(), visibility: z.enum(["private", "public"]) })
    .safeParse({ id: formData.get("id"), visibility: formData.get("visibility") });
  if (!parsed.success) return { error: "Diese Vorlage gibt es nicht mehr." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_templates")
    .update({ visibility: parsed.data.visibility })
    .eq("id", parsed.data.id)
    .select("id");

  if (error) return { error: SAVE_FAILED };
  if (data.length === 0) return { error: "Diese Vorlage gibt es nicht mehr." };

  revalidateTemplateViews(parsed.data.id);
  return {
    message: parsed.data.visibility === "public"
      ? "Die Vorlage ist jetzt öffentlich."
      : "Die Vorlage ist jetzt privat.",
  };
}

/**
 * Macht eine alte Version zur neuesten: Ihr Inhalt wird als neue Version gespeichert,
 * der Verlauf bleibt vollständig erhalten.
 */
export async function restoreTemplateVersion(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ id: z.uuid(), version: z.coerce.number().int().positive() })
    .safeParse({ id: formData.get("id"), version: formData.get("version") });
  if (!parsed.success) return { error: "Diese Version gibt es nicht mehr." };

  const supabase = await createClient();
  const { data: template, error: readError } = await supabase
    .from("workout_templates")
    .select("name, visibility, template_versions!inner(id)")
    .eq("id", parsed.data.id)
    .eq("template_versions.version_number", parsed.data.version)
    .maybeSingle();

  if (readError) return { error: SAVE_FAILED };
  const versionId = template?.template_versions[0]?.id;
  if (!template || !versionId) return { error: "Diese Version gibt es nicht mehr." };

  const { data: rows, error: rowsError } = await supabase
    .from("template_version_exercises")
    .select(
      "exercise_id, target_sets, target_reps, target_weight_kg, target_duration_seconds, target_distance_m",
    )
    .eq("version_id", versionId)
    .order("position")
    .limit(30);
  if (rowsError) return { error: SAVE_FAILED };

  const { error } = await supabase.rpc("save_template", {
    p_template_id: parsed.data.id,
    p_version_id: crypto.randomUUID(),
    p_name: template.name,
    p_visibility: template.visibility,
    p_note: `Wiederhergestellt aus Version ${parsed.data.version}`,
    p_exercises: rows.map((row) => ({
      exercise_id: row.exercise_id,
      target_sets: row.target_sets,
      target_reps: row.target_reps ?? undefined,
      target_weight_kg: row.target_weight_kg ?? undefined,
      target_duration_seconds: row.target_duration_seconds ?? undefined,
      target_distance_m: row.target_distance_m ?? undefined,
    })),
  });
  if (error) return { error: SAVE_FAILED };

  revalidateTemplateViews(parsed.data.id);
  redirect(`/vorlagen/${parsed.data.id}`);
}

/** Löscht eine eigene Vorlage mit allen Versionen. Kopien anderer Personen bleiben bestehen. */
export async function deleteTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Diese Vorlage gibt es nicht mehr." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("workout_templates").delete().eq("id", id.data).select("id");

  if (error) return { error: "Löschen fehlgeschlagen. Prüf deine Verbindung und versuch es erneut." };
  if (data.length === 0) return { error: "Diese Vorlage gibt es nicht mehr." };

  revalidateTemplateViews();
  redirect("/vorlagen");
}

const sportGoalsSchema = z
  .array(
    z.object({
      sport_id: z.string().regex(/^[a-z0-9_]{2,40}$/),
      times: z.int().min(1).max(14, "Höchstens 14 pro Woche."),
    }),
  )
  .max(5, "Höchstens fünf Vorhaben.");

/**
 * Ersetzt die eigenen Vorhaben je Sportart in einem Schritt (set_sport_goals). Das Formular schickt
 * sie als JSON in der gewünschten Reihenfolge; 0× ist schon herausgefiltert.
 */
export async function saveSportGoals(_prev: FormState, formData: FormData): Promise<FormState> {
  let raw: unknown = null;
  try {
    raw = JSON.parse(String(formData.get("goals") ?? "[]"));
  } catch {
    // Prüfung unten meldet den Fehler
  }
  const parsed = sportGoalsSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Die Vorhaben sind ungültig." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_sport_goals", { p_goals: parsed.data });
  if (error) return { error: "Das hat nicht geklappt. Versuch es erneut." };

  revalidatePath("/");
  return { message: "Vorhaben gespeichert." };
}

/**
 * Speichert das eigene Körpergewicht für Kalorien (set_body_weight). Gesundheitsdatum: nur mit
 * Einwilligung, die Datenbank prüft sie und den Bereich noch einmal.
 */
export async function saveBodyWeight(_prev: FormState, formData: FormData): Promise<FormState> {
  const weightKg = parseBodyWeight(String(formData.get("weight") ?? ""));
  if (weightKg === null) {
    return { error: `Gib dein Gewicht in kg zwischen ${BODY_WEIGHT_MIN} und ${BODY_WEIGHT_MAX} ein, zum Beispiel 72,5.` };
  }
  if (formData.get("consent") !== "on") {
    return { error: "Setz das Häkchen, damit wir dein Gewicht speichern dürfen." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_body_weight", { p_weight_kg: weightKg, p_consent: true });
  if (error) return { error: "Das hat nicht geklappt. Versuch es erneut." };

  revalidatePath("/", "layout");
  return { message: "Gewicht gespeichert." };
}

/** Löscht das eigene Körpergewicht samt Einwilligung. Danach erscheinen keine Kalorien mehr. */
export async function deleteBodyWeight(_prev: FormState, _formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };
  const { error } = await supabase.from("body_weights").delete().eq("user_id", userId);
  if (error) return { error: "Das hat nicht geklappt. Versuch es erneut." };

  revalidatePath("/", "layout");
  return { message: "Gewicht gelöscht." };
}
