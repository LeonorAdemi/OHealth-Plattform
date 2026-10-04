import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_TIME_ZONE, summarizeSets } from "@/modules/workouts/logic";
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
      <h1 className="text-titel font-semibold">Verlauf</h1>

      {workouts.length === 0 ? (
        <div className="mt-8">
          <p>Noch keine Workouts. Starte dein erstes.</p>
          <Button asChild className="mt-6 w-full md:w-auto">
            <Link href="/workouts/neu">Workout starten</Link>
          </Button>
        </div>
      ) : (
        <ol className="mt-6 max-w-2xl">
          {workouts.map((workout) => (
            <li key={workout.id} className="border-b">
              <Link
                href={`/workouts/${workout.id}`}
                className="hover:bg-accent -mx-2 block rounded-lg px-2 py-4 transition-colors duration-150 ease-out"
              >
                <span className="text-muted-foreground block text-sm">
                  {dateFormat.format(new Date(workout.performed_at))}
                </span>
                <span className="mt-1 block font-medium">{workout.title ?? "Workout"}</span>
                <span className="text-muted-foreground mt-1 block text-sm">
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
