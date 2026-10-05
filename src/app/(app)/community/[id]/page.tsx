import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { TabLinks } from "@/components/ui/tab-links";
import { requestOrigin } from "@/lib/request-origin";
import {
  LeaveCommunity,
  ReportCommunity,
} from "@/modules/core/components/community-forms";
import { ChatRow } from "@/modules/core/components/chat-link";
import { InviteShare } from "@/modules/core/components/invite-share";
import { MeetupList } from "@/modules/core/components/meetup-list";
import { RemoveMember } from "@/modules/core/components/report-form";
import {
  COMMUNITY_KIND_HINT,
  COMMUNITY_KIND_LABEL,
  describeCommunity,
} from "@/modules/core/logic";
import {
  type ChatSummary,
  getChatSummaries,
  getGroupMembers,
  getMeetups,
  getMyCommunity,
  requireUser,
} from "@/modules/core/queries";
import { Leaderboard } from "@/modules/workouts/components/leaderboard";
import { WorkoutFeed } from "@/modules/workouts/components/workout-feed";
import { isoWeek } from "@/modules/workouts/logic";
import {
  getCommunityLeaderboard,
  getGroupActivity,
  getLeaderboard,
} from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Community" };

const TABS = ["pinnwand", "rangliste", "info"] as const;
type Tab = (typeof TABS)[number];
const LEADERBOARD_SIZE = 20;

export default async function CommunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [community, chats] = await Promise.all([
    getMyCommunity(id),
    getChatSummaries(),
  ]);
  if (!community) notFound();
  // Coaching-Gruppen haben keinen gemeinsamen Chat (Migration chats)
  const chat = chats.byGroup[id];

  const tab: Tab = TABS.find((t) => t === rawTab) ?? "pinnwand";
  const origin = await requestOrigin();
  const inviteUrl = `${origin}/beitreten/${community.inviteCode}`;

  return (
    <>
      <p className="text-sm">
        <Link
          href="/community"
          className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Alle Communities
        </Link>
      </p>
      <div className="mt-2 flex max-w-2xl items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-titel font-semibold break-words">
            {community.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {COMMUNITY_KIND_LABEL[community.kind]} ·{" "}
            {describeCommunity(community)}
          </p>
        </div>
        <div className="shrink-0 pt-1">
          <InviteShare url={inviteUrl} groupName={community.name} compact />
        </div>
      </div>

      {chat && (
        <div className="mt-4 max-w-2xl">
          <ChatRow
            chat={chat}
            label="Chat der Community"
            emptyText="Noch keine Nachrichten. Alle Mitglieder lesen mit."
          />
        </div>
      )}

      <div className="mt-6 max-w-2xl">
        <TabLinks
          label="Bereiche der Community"
          active={tab}
          tabs={[
            { key: "pinnwand", label: "Pinnwand", href: `/community/${id}` },
            {
              key: "rangliste",
              label: "Rangliste",
              href: `/community/${id}?tab=rangliste`,
            },
            { key: "info", label: "Info", href: `/community/${id}?tab=info` },
          ]}
        />
      </div>

      <div className="max-w-2xl">
        {tab === "pinnwand" && <BoardTab id={id} chats={chats.byMeetup} />}
        {tab === "rangliste" && (
          <RankingTab id={id} isPublic={community.kind === "public"} />
        )}
        {tab === "info" && (
          <InfoTab community={community} inviteUrl={inviteUrl} />
        )}
      </div>
    </>
  );
}

async function BoardTab({
  id,
  chats,
}: {
  id: string;
  chats: Record<string, ChatSummary>;
}) {
  const meetups = await getMeetups("board", { groupId: id, from: new Date() });

  return (
    <section aria-label="Pinnwand" className="mt-2">
      {meetups.length === 0 ? (
        <p className="text-muted-foreground py-4">
          Noch keine geplanten Trainings. Plane deins und teile es hier, dann
          können andere mitmachen.
        </p>
      ) : (
        <MeetupList
          label="Geplante Trainings"
          meetups={meetups}
          chats={chats}
        />
      )}
      <Button asChild className="mt-6 w-full md:w-auto">
        <Link href={`/plan/neu?community=${id}`}>Training planen</Link>
      </Button>
    </section>
  );
}

async function RankingTab({ id, isPublic }: { id: string; isPublic: boolean }) {
  const now = new Date();
  const [rows, activity] = await Promise.all([
    isPublic ? getCommunityLeaderboard(id, now) : getLeaderboard(id, now),
    // In öffentlichen Communities gibt es keine Workout-Details anderer Mitglieder.
    isPublic ? Promise.resolve([]) : getGroupActivity(id),
  ]);

  return (
    <>
      <section className="mt-6" aria-labelledby="konstanz">
        <h2 id="konstanz" className="text-xl font-semibold">
          Trainingstage in Woche {isoWeek(now)}
        </h2>
        <div className="mt-2">
          <Leaderboard rows={rows} limit={LEADERBOARD_SIZE} />
        </div>
        <p className="text-muted-foreground mt-3 text-sm">
          {rows.length > LEADERBOARD_SIZE
            ? `Die ersten ${LEADERBOARD_SIZE} und dein Platz. `
            : ""}
          <Link
            href={`/community/${id}/bestwerte`}
            className="text-foreground underline underline-offset-4"
          >
            Bestwerte je Übung
          </Link>
        </p>
      </section>

      {activity.length > 0 && (
        <section className="mt-10" aria-labelledby="aktivitaet">
          <h2 id="aktivitaet" className="text-xl font-semibold">
            Zuletzt trainiert
          </h2>
          <div className="mt-2">
            <WorkoutFeed
              label="Zuletzt trainiert"
              now={now}
              workouts={activity}
            />
          </div>
        </section>
      )}
    </>
  );
}

async function InfoTab({
  community,
  inviteUrl,
}: {
  community: NonNullable<Awaited<ReturnType<typeof getMyCommunity>>>;
  inviteUrl: string;
}) {
  const isManager = community.role === "admin" || community.role === "coach";
  const [{ userId }, members] = await Promise.all([
    requireUser(),
    isManager ? getGroupMembers(community.id) : Promise.resolve([]),
  ]);
  const managesAlone =
    isManager &&
    !members.some(
      (m) => m.userId !== userId && (m.role === "admin" || m.role === "coach"),
    );

  return (
    <>
      <section className="mt-6" aria-label="Über diese Community">
        {community.description && <p>{community.description}</p>}
        <p className="text-muted-foreground mt-2 text-sm">
          {COMMUNITY_KIND_HINT[community.kind]}
        </p>
      </section>

      <section className="mt-10" aria-labelledby="einladen">
        <h2 id="einladen" className="text-xl font-semibold">
          Einladen
        </h2>
        <p className="mt-2">
          Wer diesen Link öffnet, sieht eine Vorschau und kann mit einem Tipp
          beitreten, auch ohne Konto.
        </p>
        <div className="mt-3">
          <InviteShare url={inviteUrl} groupName={community.name} />
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          Oder als Code zum Eintippen:{" "}
          <span className="text-foreground num select-all">
            {community.inviteCode}
          </span>
        </p>
      </section>

      {isManager && members.length > 1 && (
        <section className="mt-10" aria-labelledby="mitglieder">
          <h2 id="mitglieder" className="text-xl font-semibold">
            Mitglieder
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Wer entfernt wird, kann 30 Tage lang nicht wieder beitreten.
          </p>
          <ul className="mt-2" aria-label="Mitglieder">
            {members
              .filter((m) => m.userId !== userId)
              .map((m) => (
                <li
                  key={m.userId}
                  className="flex min-h-14 items-center justify-between gap-4 border-b py-2"
                >
                  <span className="min-w-0 break-words">
                    {m.name}
                    {m.role !== "member" && (
                      <span className="text-muted-foreground text-sm">
                        {" "}
                        · verwaltet
                      </span>
                    )}
                  </span>
                  {m.role === "member" && (
                    <RemoveMember
                      groupId={community.id}
                      userId={m.userId}
                      name={m.name}
                    />
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="mt-12 space-y-2" aria-label="Verwalten">
        {!isManager && <ReportCommunity id={community.id} />}
        <LeaveCommunity id={community.id} managesAlone={managesAlone} />
      </section>
    </>
  );
}
