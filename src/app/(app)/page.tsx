import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ResumeTraining } from "@/modules/workouts/components/resume-training";
import { WeekGrid } from "@/modules/workouts/components/week-grid";
import { isoWeek, weekGrid } from "@/modules/workouts/logic";
import { getMyTrainingDays } from "@/modules/workouts/queries";

export default async function TodayPage() {
  const now = new Date();
  const days = weekGrid(await getMyTrainingDays(now), now);
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

      <Button asChild className="mt-10 w-full md:w-auto">
        <Link href="/training">Workout starten</Link>
      </Button>
    </>
  );
}
