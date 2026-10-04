"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState, Result } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

const setSchema = z
  .object({
    exercise_id: z.uuid(),
    set_number: z.int().positive(),
    reps: z.int().positive().optional(),
    duration_seconds: z.int().positive().optional(),
    distance_m: z.number().positive().optional(),
    weight_kg: z.number().min(0).max(9999),
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

function revalidateWorkoutViews(id?: string) {
  revalidatePath("/");
  revalidatePath("/verlauf");
  revalidatePath("/gruppe");
  if (id) revalidatePath(`/workouts/${id}`);
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
  if (!id.success) return { error: "Dieses Workout gibt es nicht mehr." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("workouts").delete().eq("id", id.data).select("id");

  if (error) return { error: "Löschen fehlgeschlagen. Prüf deine Verbindung und versuch es erneut." };
  if (data.length === 0) return { error: "Dieses Workout gibt es nicht mehr." };

  revalidateWorkoutViews();
  redirect("/verlauf");
}
