import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ResumeTraining } from "@/modules/workouts/components/resume-training";
import { WorkoutFeed } from "@/modules/workouts/components/workout-feed";
import { WeekGrid } from "@/modules/workouts/components/week-grid";
import { isoWeek, weekGrid } from "@/modules/workouts/logic";
import { getMyTrainingDays, getRecentWorkouts } from "@/modules/workouts/queries";

export default async function TodayPage() {
  const now = new Date();
  const [trainingDays, recent] = await Promise.all([getMyTrainingDays(now), getRecentWorkouts(5)]);
  const days = weekGrid(trainingDays, now);
  const count = days.filter(Boolean).length;

  return (
    <>
      <h1 className="text-muted-foreground text-sm">Woche {isoWeek(now)}</h1>
      <p className="num-display text-grosszahl mt-2">{count}</p>
      <p className="mt-1">{count === 1 ? "Trainingstag" : "Trainingstage"} diese Woche</p>
      <div className="mt-4">
        <WeekGrid days={days} own size="lg" />
      </div>

      <ResumeTraining className="mt-8" />

      {recent.length > 0 && (
        <section className="mt-8 max-w-2xl" aria-labelledby="recent">
          <h2 id="recent" className="text-xl font-semibold">
            Letzte Workouts
          </h2>
          <div className="mt-2">
            <WorkoutFeed
              label="Letzte Workouts"
              now={now}
              workouts={recent.map((workout) => ({
                id: workout.id,
                isMe: true,
                title: workout.title,
                performedAt: workout.performed_at,
                startedAt: workout.started_at,
                finishedAt: workout.finished_at,
                setCount: workout.workout_sets.length,
              }))}
            />
          </div>
        </section>
      )}

      <Button asChild className="mt-10 w-full md:w-auto">
        <Link href="/training">Workout starten</Link>
      </Button>
    </>
  );
}
