import type { Metadata } from "next";
import Link from "next/link";

import { CreateMeetupForm } from "@/modules/core/components/meetup-forms";
import { berlinDateTimeParts, COMMUNITY_KIND_LABEL } from "@/modules/core/logic";
import { getCommunitySportId, getMyCommunities, getSports } from "@/modules/core/queries";
import { getMyRecentSportIds, getMyTemplates } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Training planen" };

const HOUR = 60 * 60 * 1000;

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; community?: string }>;
}) {
  const { tag, community } = await searchParams;
  const communityId = community && /^[0-9a-f-]{36}$/.test(community) ? community : null;
  const [templates, communities, sports, recentSportIds, communitySportId] = await Promise.all([
    getMyTemplates(),
    getMyCommunities(),
    getSports(),
    getMyRecentSportIds(),
    communityId ? getCommunitySportId(communityId) : null,
  ]);

  // Vorschlag: die nächste volle Stunde, oder 18 Uhr am gewählten Tag
  const now = new Date().getTime();
  const today = berlinDateTimeParts(new Date(now)).date;
  const nextHour = berlinDateTimeParts(new Date(Math.ceil((now + 1) / HOUR) * HOUR));
  const day = tag && /^\d{4}-\d{2}-\d{2}$/.test(tag) && tag >= today ? tag : null;
  const from = communities.find((c) => c.id === community);

  return (
    <>
      <p className="text-sm">
        <Link
          href={from ? `/community/${from.id}` : "/"}
          className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4"
        >
          {from ? from.name : "Heute"}
        </Link>
      </p>
      <h1 className="text-titel mt-2 font-semibold">Training planen</h1>
      <p className="mt-2 max-w-xl">
        Wähl die Sportart und wann es losgeht. Teilst du es mit einer Community, können andere mitmachen.
      </p>
      <div className="mt-8">
        <CreateMeetupForm
          sports={sports}
          recentSportIds={recentSportIds}
          // Aus einer Community heraus: deren Sportart vorbelegen
          defaultSportId={from ? communitySportId : null}
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          communities={communities.map((c) => ({ id: c.id, name: c.name, kindLabel: COMMUNITY_KIND_LABEL[c.kind] }))}
          preselected={from ? [from.id] : []}
          defaultDate={day ?? nextHour.date}
          defaultTime={day && day !== today ? "18:00" : nextHour.time}
          minDate={today}
        />
      </div>
    </>
  );
}
