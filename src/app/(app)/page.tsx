import Link from "next/link";

import { Button } from "@/components/ui/button";
import { type PlanItem, WeekPlan } from "@/modules/core/components/week-plan";
import { berlinDateTimeParts, berlinWeek, describeMeetupCount, formatMeetupWhen } from "@/modules/core/logic";
import { getMeetups } from "@/modules/core/queries";
import { ResumeTraining } from "@/modules/workouts/components/resume-training";
import { WorkoutFeed } from "@/modules/workouts/components/workout-feed";
import { WeekGrid } from "@/modules/workouts/components/week-grid";
import { isoWeek, weekGrid } from "@/modules/workouts/logic";
import { getMyTrainingDays, getMyWorkoutsBetween, getRecentWorkouts } from "@/modules/workouts/queries";

// Wie weit der Wochenplan zurück und voraus blättert
const MAX_WEEKS_BACK = 8;
const MAX_WEEKS_AHEAD = 8;

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ woche?: string }> }) {
  const { woche } = await searchParams;
  const parsed = Number.parseInt(woche ?? "0", 10);
  const offset = Number.isFinite(parsed) ? Math.min(Math.max(parsed, -MAX_WEEKS_BACK), MAX_WEEKS_AHEAD) : 0;

  const now = new Date();
  const week = berlinWeek(now, offset);
  const [trainingDays, recent, planned, done] = await Promise.all([
    getMyTrainingDays(now),
    getRecentWorkouts(5),
    getMeetups("mine", { from: week.from, to: week.to, limit: 100 }),
    getMyWorkoutsBetween(week.from, week.to),
  ]);
  const days = weekGrid(trainingDays, now);
  const count = days.filter(Boolean).length;

  const items: Record<string, PlanItem[]> = {};
  const add = (date: string, item: PlanItem) => (items[date] ??= []).push(item);
  for (const m of planned) {
    const meta = m.isMine
      ? m.shareCount === 0
        ? "Privat"
        : `Geteilt · ${describeMeetupCount(m.count, m.maxParticipants)}`
      : `Mit ${m.creatorName} · ${describeMeetupCount(m.count, m.maxParticipants)}`;
    add(berlinDateTimeParts(new Date(m.startsAt)).date, {
      key: `plan-${m.id}`,
      href: `/plan/${m.id}`,
      time: formatMeetupWhen(m.startsAt).split(" ")[1],
      title: m.title,
      meta: m.place ? `${meta} · ${m.place}` : meta,
      done: false,
    });
  }
  for (const w of done) {
    add(berlinDateTimeParts(new Date(w.performedAt)).date, {
      key: `done-${w.id}`,
      href: `/workouts/${w.id}`,
      time: "",
      title: w.title ?? "Workout",
      meta: `${w.setCount} ${w.setCount === 1 ? "Satz" : "Sätze"}`,
      done: true,
    });
  }
  // Erledigtes vor Geplantem, sonst nach Uhrzeit
  for (const list of Object.values(items)) list.sort((a, b) => Number(b.done) - Number(a.done) || a.time.localeCompare(b.time));

  const planTitle =
    offset === 0 ? "Deine Woche" : offset === 1 ? "Nächste Woche" : offset === -1 ? "Letzte Woche" : `Woche ${isoWeek(week.from)}`;

  return (
    <>
      <h1 className="text-muted-foreground text-sm">Woche {isoWeek(now)}</h1>
      <p className="num-display text-grosszahl mt-2">{count}</p>
      <p className="mt-1">{count === 1 ? "Trainingstag" : "Trainingstage"} diese Woche</p>
      <div className="mt-4">
        <WeekGrid days={days} own size="lg" />
      </div>

      <ResumeTraining className="mt-8" />

      <div className="mt-8 max-w-2xl">
        <WeekPlan
          title={planTitle}
          days={week.days}
          items={items}
          prevHref={offset > -MAX_WEEKS_BACK ? `/?woche=${offset - 1}` : null}
          nextHref={offset < MAX_WEEKS_AHEAD ? `/?woche=${offset + 1}` : null}
          minDate={berlinDateTimeParts(now).date}
        />
      </div>

      {recent.length > 0 && (
        <section className="mt-10 max-w-2xl" aria-labelledby="recent">
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

      <div className="mt-10 flex flex-col gap-3 md:flex-row">
        <Button asChild className="w-full md:w-auto">
          <Link href="/training">Workout starten</Link>
        </Button>
        <Button asChild variant="outline" className="w-full md:w-auto">
          <Link href="/plan/neu">Training planen</Link>
        </Button>
      </div>
    </>
  );
}
