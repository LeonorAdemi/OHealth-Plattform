import type { Metadata } from "next";

import { getExercises } from "@/modules/core/queries";
import { WorkoutForm } from "@/modules/workouts/components/workout-form";

export const metadata: Metadata = { title: "Workout" };

export default async function NewWorkoutPage() {
  const exercises = await getExercises();

  return (
    <>
      <h1 className="text-titel font-semibold">Workout</h1>
      <div className="mt-8">
        <WorkoutForm exercises={exercises} />
      </div>
    </>
  );
}
