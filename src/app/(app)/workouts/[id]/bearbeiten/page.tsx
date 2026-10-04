import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getExercises } from "@/modules/core/queries";
import { WorkoutForm } from "@/modules/workouts/components/workout-form";
import { toDraftEntries } from "@/modules/workouts/logic";
import { getWorkout } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Workout korrigieren" };

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [workout, exercises] = await Promise.all([
    getWorkout(id),
    getExercises(),
  ]);
  if (!workout) notFound();

  return (
    <>
      <h1 className="text-titel font-semibold">Workout korrigieren</h1>
      <div className="mt-8">
        <WorkoutForm
          exercises={exercises}
          existing={{
            id: workout.id,
            title: workout.title ?? "",
            entries: toDraftEntries(workout.sets),
          }}
        />
      </div>
    </>
  );
}
