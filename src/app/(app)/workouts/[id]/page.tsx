import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { DeleteWorkout } from "@/modules/workouts/components/delete-workout";
import {
  APP_TIME_ZONE,
  formatSetLine,
  groupSetsIntoBlocks,
} from "@/modules/workouts/logic";
import { getWorkout } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Workout" };

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: APP_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const workout = await getWorkout(id);
  if (!workout) notFound();

  return (
    <>
      <p className="text-muted-foreground text-sm">
        {dateFormat.format(new Date(workout.performedAt))}
      </p>
      <h1 className="text-titel mt-1 font-semibold">
        {workout.title ?? "Workout"}
      </h1>

      <div className="mt-8 max-w-2xl space-y-8">
        {groupSetsIntoBlocks(workout.sets).map((block, index) => (
          <section key={index} aria-label={block.exerciseName}>
            <h2 className="text-xl font-semibold">{block.exerciseName}</h2>
            <ol className="mt-2">
              {block.sets.map((set, setIndex) => (
                <li
                  key={setIndex}
                  className="flex min-h-11 items-center gap-3 border-b"
                >
                  <span className="text-muted-foreground w-6 text-sm">
                    {setIndex + 1}
                  </span>
                  <span className="num">{formatSetLine(set)}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <div className="mt-10 space-y-4">
        <Button asChild variant="outline" className="w-full md:w-auto">
          <Link href={`/workouts/${workout.id}/bearbeiten`}>
            Workout korrigieren
          </Link>
        </Button>
        <div>
          <DeleteWorkout id={workout.id} />
        </div>
      </div>
    </>
  );
}
