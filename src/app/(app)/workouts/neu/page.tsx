import type { Metadata } from "next";

import { getExercises } from "@/modules/core/queries";
import { WorkoutForm } from "@/modules/workouts/components/workout-form";

export const metadata: Metadata = { title: "Sätze nachtragen" };

export default async function NewWorkoutPage() {
  const exercises = await getExercises();

  return (
    <>
      <h1 className="text-titel font-semibold">Sätze nachtragen</h1>
      <div className="mt-8">
        <WorkoutForm exercises={exercises} />
      </div>
    </>
  );
}
