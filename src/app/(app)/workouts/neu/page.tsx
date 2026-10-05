import type { Metadata } from "next";

import { getExercises, getSports } from "@/modules/core/queries";
import { WorkoutForm } from "@/modules/workouts/components/workout-form";

export const metadata: Metadata = { title: "Sätze nachtragen" };

export default async function NewWorkoutPage({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const { sport } = await searchParams;
  const [exercises, sports] = await Promise.all([getExercises(), getSports()]);
  // Nur Sportarten mit Übungen und Sätzen, alles andere heißt Krafttraining.
  const chosen = sports.find((s) => s.id === sport && s.hasSets);

  return (
    <>
      <h1 className="text-titel font-semibold">Sätze nachtragen</h1>
      {chosen && <p className="text-muted-foreground mt-1 text-sm">{chosen.name}</p>}
      <div className="mt-8">
        <WorkoutForm exercises={exercises} sportId={chosen?.id} />
      </div>
    </>
  );
}
