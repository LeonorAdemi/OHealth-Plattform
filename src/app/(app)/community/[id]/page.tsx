import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { LeaveCommunity, ReportCommunity } from "@/modules/core/components/community-forms";
import { InviteShare } from "@/modules/core/components/invite-share";
import { COMMUNITY_KIND_HINT, COMMUNITY_KIND_LABEL, describeCommunity } from "@/modules/core/logic";
import { getGroupMembers, getMyCommunities, requireUser } from "@/modules/core/queries";
import { BestRanking } from "@/modules/workouts/components/best-ranking";
import { Leaderboard } from "@/modules/workouts/components/leaderboard";
import { WorkoutFeed } from "@/modules/workouts/components/workout-feed";
import { isoWeek } from "@/modules/workouts/logic";
import {
  getCommunityBests,
  getCommunityLeaderboard,
  getGroupActivity,
  getGroupBests,
  getLeaderboard,
} from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ u?: string }>;
}) {
  const [{ id }, { u }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [{ userId }, mine] = await Promise.all([requireUser(), getMyCommunities()]);
  const community = mine.find((c) => c.id === id);
  if (!community) notFound();

  const now = new Date();
  const isPublic = community.kind === "public";
  const isManager = community.role === "admin" || community.role === "coach";

  const [rows, bests, activity, members, requestHeaders] = await Promise.all([
    isPublic ? getCommunityLeaderboard(id, now) : getLeaderboard(id, now),
    isPublic ? getCommunityBests(id, u) : getGroupBests(id, u),
    // In öffentlichen Communities gibt es keine Workout-Details anderer Mitglieder.
    isPublic ? Promise.resolve([]) : getGroupActivity(id),
    isManager ? getGroupMembers(id) : Promise.resolve([]),
    headers(),
  ]);
  const managesAlone =
    isManager && !members.some((m) => m.userId !== userId && (m.role === "admin" || m.role === "coach"));

  // Öffentliche Adresse der App: hinter Vercel steht sie in den x-forwarded-Headern.
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const inviteUrl = `${protocol}://${host}/beitreten/${community.inviteCode}`;

  return (
    <>
      <p className="text-sm">
        <Link href="/community" className="text-muted-foreground underline underline-offset-4">
          Alle Communities
        </Link>
      </p>
      <p className="text-muted-foreground mt-4 text-sm">
        {COMMUNITY_KIND_LABEL[community.kind]} · {describeCommunity(community)}
      </p>
      <h1 className="text-titel mt-1 font-semibold">{community.name}</h1>
      {community.description && <p className="mt-2 max-w-xl">{community.description}</p>}
      <p className="text-muted-foreground mt-2 max-w-xl text-sm">{COMMUNITY_KIND_HINT[community.kind]}</p>

      <section className="mt-8 max-w-2xl" aria-labelledby="konstanz">
        <h2 id="konstanz" className="text-xl font-semibold">
          Trainingstage in Woche {isoWeek(now)}
        </h2>
        <div className="mt-2">
          <Leaderboard rows={rows} />
        </div>
      </section>

      {activity.length > 0 && (
        <section className="mt-10 max-w-2xl" aria-labelledby="aktivitaet">
          <h2 id="aktivitaet" className="text-xl font-semibold">
            Zuletzt trainiert
          </h2>
          <div className="mt-2">
            <WorkoutFeed label="Zuletzt trainiert" now={now} workouts={activity} />
          </div>
        </section>
      )}

      <section className="mt-10 max-w-2xl" aria-labelledby="bestwerte">
        <h2 id="bestwerte" className="text-xl font-semibold">
          Bestwerte
        </h2>

        {bests.selected ? (
          <>
            <ul className="mt-2 flex flex-wrap gap-x-4 text-sm">
              {bests.exercises.map((exercise) => (
                <li key={exercise.id}>
                  <Link
                    href={`/community/${id}?u=${exercise.id}#bestwerte`}
                    aria-current={exercise.id === bests.selected?.id ? "true" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center underline-offset-4",
                      exercise.id === bests.selected?.id ? "font-medium" : "text-muted-foreground underline",
                    )}
                  >
                    {exercise.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-1 text-sm">
              {bests.selected.measure === "weight_reps"
                ? "Geschätztes Maximum für eine Wiederholung, berechnet aus dem besten Satz."
                : bests.selected.measure === "duration"
                  ? "Längste gehaltene Zeit."
                  : "Gesamte Strecke aller Workouts."}
            </p>
            <div className="mt-2">
              <BestRanking rows={bests.ranking} />
            </div>
          </>
        ) : (
          <p className="mt-2">Noch keine Bestwerte. Sie erscheinen, sobald jemand hier ein Workout speichert.</p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="einladen">
        <h2 id="einladen" className="text-xl font-semibold">
          Einladen
        </h2>
        <p className="mt-2 max-w-xl">
          Wer diesen Link öffnet, sieht eine Vorschau und kann mit einem Tipp beitreten, auch ohne Konto.
        </p>
        <div className="mt-3">
          <InviteShare url={inviteUrl} groupName={community.name} />
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          Oder als Code zum Eintippen: <span className="text-foreground num select-all">{community.inviteCode}</span>
        </p>
      </section>

      <section className="mt-12 max-w-2xl space-y-2" aria-label="Verwalten">
        {!isManager && <ReportCommunity id={id} />}
        <LeaveCommunity id={id} managesAlone={managesAlone} />
      </section>
    </>
  );
}
