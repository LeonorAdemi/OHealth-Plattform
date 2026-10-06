import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { activityMinutes, APP_TIME_ZONE, describeActivity, summarizeSets } from "@/modules/workouts/logic";
import { getRecentWorkouts } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Verlauf" };

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "long",
});

export default async function HistoryPage() {
  const workouts = await getRecentWorkouts();

  return (
    <>
      <p className="text-sm">
        <Link
          href="/profil"
          className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Profil
        </Link>
      </p>
      <h1 className="text-titel mt-2 font-semibold">Verlauf</h1>

      {workouts.length === 0 ? (
        <div className="mt-8">
          <p>Noch keine Aktivitäten. Trag deine erste ein.</p>
          <Button asChild className="mt-6 w-full md:w-auto">
            <Link href="/aktivitaet/neu">Aktivität eintragen</Link>
          </Button>
        </div>
      ) : (
        <ol className="mt-6 max-w-2xl">
          {workouts.map((workout) => (
            <li key={workout.id} className="border-b">
              <Link
                href={`/aktivitaet/${workout.id}`}
                className="hover:bg-accent -mx-2 block rounded-lg px-2 py-4 transition-colors duration-150 ease-out"
              >
                <span className="text-muted-foreground block text-sm">
                  {dateFormat.format(new Date(workout.performed_at))}
                </span>
                <span className="mt-1 block font-medium">{workout.title ?? workout.sportName}</span>
                <span className="text-muted-foreground mt-1 block text-sm">
                  <span className="block">
                    {describeActivity({
                      sportName: workout.title ? workout.sportName : "",
                      durationMinutes: activityMinutes({
                        durationMinutes: workout.duration_minutes,
                        startedAt: workout.started_at,
                        finishedAt: workout.finished_at,
                      }),
                      distanceM: workout.distance_m,
                      elevationM: workout.elevation_m,
                      setCount: 0,
                    })}
                  </span>
                  {summarizeSets(workout.workout_sets).map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
