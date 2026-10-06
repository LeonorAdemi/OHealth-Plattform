import Link from "next/link";

import { AttendanceQuestion } from "@/modules/core/components/meetup-forms";
import { MeetupDate } from "@/modules/core/components/meetup-list";
import { type PlanItem, WeekPlan } from "@/modules/core/components/week-plan";
import { berlinDateTimeParts, berlinWeek, describeMeetupCount, formatMeetupWhen } from "@/modules/core/logic";
import { getMeetups, getOpenAttendance, getSports } from "@/modules/core/queries";
import { QuickEntry } from "@/modules/workouts/components/quick-entry";
import { ResumeTraining } from "@/modules/workouts/components/resume-training";
import { SportRings } from "@/modules/workouts/components/sport-rings";
import { WeekGrid } from "@/modules/workouts/components/week-grid";
import { ActivityHeatmap, WeekBests, WeekStats } from "@/modules/workouts/components/today-overview";
import { describeActivity, describeWeekProgress, isoWeek, quickEntrySports } from "@/modules/workouts/logic";
import {
  getActivityDays,
  getMyRecentSportDurations,
  getMyWorkoutsBetween,
  getNewBests,
  getWeekSports,
  getWeeklySummary,
} from "@/modules/workouts/queries";

// Wie weit der Wochenplan zurück und voraus blättert
const MAX_WEEKS_BACK = 8;
const MAX_WEEKS_AHEAD = 8;
// Wochen in der Übersicht; die Serie zählt bis zu einem Jahr zurück
const OVERVIEW_WEEKS = 12;
const STREAK_WEEKS = 53;

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ woche?: string; dabei?: string; geplant?: string }>;
}) {
  const { woche, dabei, geplant } = await searchParams;
  const parsed = Number.parseInt(woche ?? "0", 10);
  const offset = Number.isFinite(parsed) ? Math.min(Math.max(parsed, -MAX_WEEKS_BACK), MAX_WEEKS_AHEAD) : 0;

  const now = new Date();
  const week = berlinWeek(now, offset);
  const thisWeek = berlinWeek(now);
  const overviewStart = berlinWeek(now, -(OVERVIEW_WEEKS - 1)).days[0].date;
  const [activityDays, planned, done, openAttendance, weekSports, summary, bests, sports, recent] = await Promise.all([
    getActivityDays(overviewStart),
    getMeetups("mine", { from: week.from, to: week.to, limit: 100 }),
    getMyWorkoutsBetween(week.from, week.to),
    getOpenAttendance(),
    getWeekSports(),
    getWeeklySummary(STREAK_WEEKS),
    getNewBests(thisWeek.from),
    getSports(),
    getMyRecentSportDurations(),
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
  // Schnell eintragen: Vorhaben und zuletzt Genutztes, vorgewählt das erste offene Vorhaben
  const quick = quickEntrySports(weekSports, recent.sportIds);
  const quickSports = quick.sportIds.flatMap((id) => sports.filter((s) => s.id === id));

  const items: Record<string, PlanItem[]> = {};
  const add = (date: string, item: PlanItem) => (items[date] ??= []).push(item);
  // Ein bestätigtes Training steht als erledigte Aktivität im Plan, nicht noch einmal als geplant.
  const confirmed = new Set(done.map((w) => w.meetupId).filter(Boolean));
  // Vorbei und noch ohne Antwort: lässt sich in der Woche abhaken
  const open = new Set(openAttendance.map((a) => a.meetupId));
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
      confirmMeetupId: open.has(m.id) ? m.id : undefined,
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
  // „Warst du dabei?“ nur für Trainings, die nicht schon in der gezeigten Woche abzuhaken sind
  const shown = new Set(planned.map((m) => m.id));
  const otherAttendance = openAttendance.filter((a) => !shown.has(a.meetupId));

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

      <div className="mt-8">
        {/* Nach dem Planen kommt die Seite mit neuem ?geplant= zurück; der neue key schließt die Ansicht. */}
        <QuickEntry
          key={geplant ?? "start"}
          sports={quickSports.map((s) => ({ id: s.id, name: s.name, category: s.category, hasDistance: s.hasDistance }))}
          selectedSportId={quick.selected}
          lastDurations={recent.lastDurations}
        />
      </div>

      <ResumeTraining className="mt-8" />

      {dabei === "1" && (
        <p role="status" className="mt-8 max-w-2xl">
          Gespeichert. Das Training zählt als Trainingstag.
        </p>
      )}
      {geplant && (
        <p role="status" className="mt-8 max-w-2xl">
          Geplant. Das Training steht in deiner Woche.
        </p>
      )}

      <div className="mt-8 max-w-2xl">
        <WeekPlan
          title={planTitle}
          days={week.days}
          items={items}
          prevHref={offset > -MAX_WEEKS_BACK ? `/?woche=${offset - 1}` : null}
          nextHref={offset < MAX_WEEKS_AHEAD ? `/?woche=${offset + 1}` : null}
          minDate={today}
        />
      </div>

      {otherAttendance.length > 0 && (
        <section className="mt-10 max-w-2xl" aria-labelledby="dabei-frage">
          <h2 id="dabei-frage" className="text-xl font-semibold">
            Warst du dabei?
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">Wer dabei war, bekommt das Training als Trainingstag.</p>
          <ul className="mt-2">
            {otherAttendance.map((a) => (
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

      <div className="mt-12">
        <WeekStats weeks={summary} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
        <WeekBests bests={bests} />
        {overview.some((w) => w.trainingDays > 0) && (
          <ActivityHeatmap weeks={overview} minutesByDay={minutesByDay} today={today} />
        )}
      </div>

      {/* Platz für die feste Leiste mit „Eintragen“ und „Planen“ über der Tab-Leiste */}
      <div className="h-20 md:hidden" aria-hidden />
    </>
  );
}
