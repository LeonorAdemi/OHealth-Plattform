import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getExercises, getSports } from "@/modules/core/queries";
import { ActivityForm } from "@/modules/workouts/components/activity-form";
import { WorkoutForm } from "@/modules/workouts/components/workout-form";
import { toDraftEntries } from "@/modules/workouts/logic";
import { getMyRecentSportIds, getWorkout } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Aktivität korrigieren" };

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  // Unabhängige Abfragen laufen zusammen; welches Formular gebraucht wird, zeigt erst die Aktivität.
  const [workout, exercises, sports, recentSportIds] = await Promise.all([
    getWorkout(id),
    getExercises(),
    getSports(),
    getMyRecentSportIds(),
  ]);
  if (!workout) notFound();

  // Mit Sätzen: Übungen und Sätze korrigieren. Ohne: die Angaben der Aktivität.
  if (workout.sets.length > 0) {
    return (
      <>
        <h1 className="text-titel font-semibold">Aktivität korrigieren</h1>
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

  return (
    <>
      <h1 className="text-titel font-semibold">Aktivität korrigieren</h1>
      <div className="mt-8">
        <ActivityForm
          sports={sports}
          recentSportIds={recentSportIds}
          existing={{
            id: workout.id,
            sportId: workout.sportId,
            performedAt: workout.performedAt,
            durationMinutes: workout.durationMinutes,
            distanceM: workout.distanceM,
            elevationM: workout.elevationM,
            feeling: workout.feeling,
            notes: workout.notes,
          }}
        />
      </div>
    </>
  );
}
