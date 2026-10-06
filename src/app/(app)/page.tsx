import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AttendanceQuestion } from "@/modules/core/components/meetup-forms";
import { MeetupDate } from "@/modules/core/components/meetup-list";
import { SportDot } from "@/modules/core/components/sport-dot";
import { type PlanDayStat, type PlanItem, WeekPlan } from "@/modules/core/components/week-plan";
import {
  berlinDateTimeParts,
  berlinWeek,
  describeMeetupCount,
  formatMeetupWhen,
  SPORT_CATEGORY_LABEL,
} from "@/modules/core/logic";
import { getMeetups, getOpenAttendance } from "@/modules/core/queries";
import { ResumeTraining } from "@/modules/workouts/components/resume-training";
import { SportRings } from "@/modules/workouts/components/sport-rings";
import { WeekGrid } from "@/modules/workouts/components/week-grid";
import { ActivityHeatmap, WeekBests, WeekStats } from "@/modules/workouts/components/today-overview";
import { WorkoutFeed } from "@/modules/workouts/components/workout-feed";
import { describeActivity, describeWeekProgress, isoWeek } from "@/modules/workouts/logic";
import {
  getActivityDays,
  getMyWorkoutsBetween,
  getNewBests,
  getRecentWorkouts,
  getWeekSports,
  getWeeklySummary,
} from "@/modules/workouts/queries";

// Wie weit der Wochenplan zurück und voraus blättert
const MAX_WEEKS_BACK = 8;
const MAX_WEEKS_AHEAD = 8;
// Wochen in der Übersicht; die Serie zählt bis zu einem Jahr zurück
const OVERVIEW_WEEKS = 12;
const STREAK_WEEKS = 53;
// „Als Nächstes“ schaut eine Woche voraus
const NEXT_DAYS = 7;

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ woche?: string; dabei?: string }> }) {
  const { woche, dabei } = await searchParams;
  const parsed = Number.parseInt(woche ?? "0", 10);
  const offset = Number.isFinite(parsed) ? Math.min(Math.max(parsed, -MAX_WEEKS_BACK), MAX_WEEKS_AHEAD) : 0;

  const now = new Date();
  const week = berlinWeek(now, offset);
  const thisWeek = berlinWeek(now);
  const overviewStart = berlinWeek(now, -(OVERVIEW_WEEKS - 1)).days[0].date;
  const [activityDays, recent, planned, done, openAttendance, weekSports, summary, upcoming, bests] = await Promise.all([
    getActivityDays(overviewStart),
    getRecentWorkouts(5),
    getMeetups("mine", { from: week.from, to: week.to, limit: 100 }),
    getMyWorkoutsBetween(week.from, week.to),
    getOpenAttendance(),
    getWeekSports(),
    getWeeklySummary(STREAK_WEEKS),
    getMeetups("mine", { from: now, to: new Date(now.getTime() + NEXT_DAYS * 86400000), limit: 1 }),
    getNewBests(thisWeek.from),
  ]);
  const today = berlinDateTimeParts(now).date;
  const monday = thisWeek.days[0].date;
  const thisWeekDays = activityDays.filter((d) => d.day >= monday);
  const count = thisWeekDays.length;
  const trainedDays = new Set(thisWeekDays.map((d) => d.day));
  const progress = describeWeekProgress(weekSports);
  const hasGoals = weekSports.some((s) => s.times !== null);
  const overview = summary.slice(0, OVERVIEW_WEEKS);
  const minutesByDay = Object.fromEntries(activityDays.map((d) => [d.day, d.minutes]));
  const dayStats: Record<string, PlanDayStat> = Object.fromEntries(
    activityDays.map((d) => [d.day, { minutes: d.minutes, category: d.category }]),
  );
  const next = upcoming[0];

  const items: Record<string, PlanItem[]> = {};
  const add = (date: string, item: PlanItem) => (items[date] ??= []).push(item);
  // Ein bestätigtes Training steht als erledigte Aktivität im Plan, nicht noch einmal als geplant.
  const confirmed = new Set(done.map((w) => w.meetupId).filter(Boolean));
  for (const m of planned.filter((p) => !confirmed.has(p.id))) {
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
      // Sportart nur, wenn der Titel sie nicht schon nennt
      meta: [m.sportName !== m.title ? m.sportName : null, meta, m.place].filter(Boolean).join(" · "),
      done: false,
      category: m.sportCategory ?? undefined,
    });
  }
  for (const w of done) {
    add(berlinDateTimeParts(new Date(w.performedAt)).date, {
      key: `done-${w.id}`,
      href: `/aktivitaet/${w.id}`,
      time: "",
      title: w.title ?? w.sportName,
      meta: describeActivity({ ...w, sportName: w.title ? w.sportName : "" }),
      done: true,
      category: w.sportCategory ?? undefined,
    });
  }
  // Erledigtes vor Geplantem, sonst nach Uhrzeit
  for (const list of Object.values(items)) list.sort((a, b) => Number(b.done) - Number(a.done) || a.time.localeCompare(b.time));

  const planTitle =
    offset === 0 ? "Deine Woche" : offset === 1 ? "Nächste Woche" : offset === -1 ? "Letzte Woche" : `Woche ${isoWeek(week.from)}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-muted-foreground text-sm">Woche {isoWeek(now)}</h1>
        <WeekGrid days={thisWeek.days.map((d) => trainedDays.has(d.date))} own />
        <span className="text-muted-foreground text-sm">
          {count} {count === 1 ? "Trainingstag" : "Trainingstage"}
        </span>
      </div>

      <section className="mt-6" aria-labelledby="vorhaben">
        <h2 id="vorhaben" className="text-xl font-semibold">
          {progress ?? "Was nimmst du dir pro Woche vor?"}
        </h2>
        {weekSports.length > 0 && (
          <div className="mt-5">
            <SportRings sports={weekSports} week={monday} />
          </div>
        )}
        {!hasGoals && (
          <p className="mt-3 text-sm">
            Je Sportart ein Kreis, der sich mit jedem Training füllt.{" "}
            <Link href="/profil/einstellungen#wochenziel" className="underline underline-offset-4">
              Vorhaben festlegen
            </Link>
          </p>
        )}
      </section>

      <div className="mt-10">
        <WeekStats weeks={summary} />
      </div>

      {next && (
        <section className="mt-10 max-w-2xl" aria-labelledby="als-naechstes">
          <h2 id="als-naechstes" className="text-xl font-semibold">
            Als Nächstes
          </h2>
          <Link href={`/plan/${next.id}`} className="group mt-2 flex min-h-16 items-center gap-4 border-b py-3">
            <MeetupDate startsAt={next.startsAt} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-medium break-words group-hover:underline group-hover:underline-offset-4">
                <SportDot category={next.sportCategory} />
                {next.title}
              </span>
              <span className="text-muted-foreground block text-sm">
                {[formatMeetupWhen(next.startsAt), next.sportName !== next.title ? next.sportName : null, next.place]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
          </Link>
        </section>
      )}

      <ResumeTraining className="mt-8" />

      {dabei === "1" && (
        <p role="status" className="mt-8 max-w-2xl">
          Gespeichert. Das Training zählt als Trainingstag.
        </p>
      )}

      {openAttendance.length > 0 && (
        <section className="mt-8 max-w-2xl" aria-labelledby="dabei-frage">
          <h2 id="dabei-frage" className="text-xl font-semibold">
            Warst du dabei?
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">Wer dabei war, bekommt das Training als Trainingstag.</p>
          <ul className="mt-2">
            {openAttendance.map((a) => (
              <li key={a.meetupId} className="flex min-h-16 items-start gap-4 border-b py-3">
                <MeetupDate startsAt={a.startsAt} />
                <div className="min-w-0 flex-1 space-y-2">
                  <Link href={`/plan/${a.meetupId}`} className="block hover:underline hover:underline-offset-4">
                    <span className="block font-medium break-words">{a.title}</span>
                    <span className="text-muted-foreground block text-sm">
                      {[a.sportName, formatMeetupWhen(a.startsAt)].filter(Boolean).join(" · ")}
                    </span>
                  </Link>
                  <AttendanceQuestion meetupId={a.meetupId} title={a.title} from="heute" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
        <div className="min-w-0 space-y-10">
          <WeekPlan
            title={planTitle}
            days={week.days}
            items={items}
            prevHref={offset > -MAX_WEEKS_BACK ? `/?woche=${offset - 1}` : null}
            nextHref={offset < MAX_WEEKS_AHEAD ? `/?woche=${offset + 1}` : null}
            minDate={today}
            dayStats={dayStats}
          />

          {recent.length > 0 && (
            <section aria-labelledby="recent">
              <h2 id="recent" className="text-xl font-semibold">
                Letzte Aktivitäten
              </h2>
              <div className="mt-2">
                <WorkoutFeed
                  label="Letzte Aktivitäten"
                  now={now}
                  workouts={recent.map((workout) => ({
                    id: workout.id,
                    isMe: true,
                    title: workout.title,
                    sportName: workout.sportName,
                    performedAt: workout.performed_at,
                    startedAt: workout.started_at,
                    finishedAt: workout.finished_at,
                    durationMinutes: workout.duration_minutes,
                    distanceM: workout.distance_m,
                    setCount: workout.workout_sets.length,
                    sportCategory: workout.sportCategory,
                  }))}
                />
              </div>
            </section>
          )}
        </div>

        <div className="min-w-0 space-y-10">
          <WeekBests bests={bests} />
          {overview.some((w) => w.trainingDays > 0) && (
            <ActivityHeatmap weeks={overview} minutesByDay={minutesByDay} today={today} />
          )}
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-3 md:flex-row">
        <Button asChild className="w-full md:w-auto">
          <Link href="/aktivitaet/neu">Aktivität eintragen</Link>
        </Button>
        <Button asChild variant="outline" className="w-full md:w-auto">
          <Link href="/training">Mit Vorlage trainieren</Link>
        </Button>
        <Button asChild variant="outline" className="w-full md:w-auto">
          <Link href="/plan/neu">Training planen</Link>
        </Button>
      </div>
    </>
  );
}
