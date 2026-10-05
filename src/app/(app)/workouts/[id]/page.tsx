import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { DeleteWorkout } from "@/modules/workouts/components/delete-workout";
import {
  activityMinutes,
  APP_TIME_ZONE,
  FEELING_LABEL,
  formatActivityDuration,
  formatClock,
  formatDistance,
  formatNumber,
  formatSetLine,
  groupSetsIntoBlocks,
} from "@/modules/workouts/logic";
import { getWorkout } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Aktivität" };

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

  const minutes = activityMinutes(workout);
  const distance = workout.distanceM ? formatDistance(workout.distanceM) : null;
  const facts = [
    { label: "Dauer", value: minutes ? formatActivityDuration(minutes) : null },
    { label: "Distanz", value: distance ? `${distance.value} ${distance.unit}` : null },
    { label: "Höhenmeter", value: workout.elevationM ? formatNumber(workout.elevationM) : null },
    { label: "Gefühl", value: workout.feeling ? FEELING_LABEL[workout.feeling] : null },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

  return (
    <>
      <p className="text-muted-foreground text-sm">
        {dateFormat.format(new Date(workout.performedAt))}
      </p>
      <h1 className="text-titel mt-1 font-semibold">
        {workout.title ?? workout.sportName}
      </h1>
      {workout.title && <p className="text-muted-foreground mt-1 text-sm">{workout.sportName}</p>}

      {facts.length > 0 && (
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="text-muted-foreground text-sm">{f.label}</dt>
              <dd className="num mt-1 text-xl font-semibold">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {workout.notes && <p className="mt-6 max-w-2xl whitespace-pre-line">{workout.notes}</p>}

      {workout.sets.length > 0 && (
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
                    {typeof set.restSeconds === "number" && (
                      <span className="text-muted-foreground ml-auto text-sm">
                        Pause <span className="num">{formatClock(set.restSeconds)}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      <div className="mt-10 space-y-4">
        <Button asChild variant="outline" className="w-full md:w-auto">
          <Link href={`/workouts/${workout.id}/bearbeiten`}>
            Aktivität korrigieren
          </Link>
        </Button>
        <div>
          <DeleteWorkout id={workout.id} />
        </div>
      </div>
    </>
  );
}
