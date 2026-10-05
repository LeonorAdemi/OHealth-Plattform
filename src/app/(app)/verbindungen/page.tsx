import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { TabLinks } from "@/components/ui/tab-links";
import { FollowRequestButtons } from "@/modules/core/components/follow-actions";
import { type FollowList, getMyFollows } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Follower" };

const TABS = [
  { key: "follower", label: "Follower", list: "followers" },
  { key: "folgt", label: "Folgt", list: "following" },
  { key: "anfragen", label: "Anfragen", list: "requests" },
] as const satisfies readonly { key: string; label: string; list: FollowList }[];

export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: raw } = await searchParams;
  const tab = TABS.find((t) => t.key === raw) ?? TABS[0];
  const people = await getMyFollows(tab.list);

  const empty = {
    followers: "Noch niemand folgt dir. Mit einem öffentlichen Konto findet man dich leichter.",
    following: "Du folgst noch niemandem.",
    requests: "Keine offenen Anfragen.",
  }[tab.list];

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
      <h1 className="text-titel mt-2 font-semibold">Follower</h1>

      <div className="mt-6 max-w-2xl">
        <TabLinks
          label="Listen"
          active={tab.key}
          tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: `/verbindungen?tab=${t.key}` }))}
        />
      </div>

      <section className="max-w-2xl" aria-label={tab.label}>
        {people.length === 0 ? (
          <div className="mt-4">
            <p className="text-muted-foreground">{empty}</p>
            <p className="mt-4">
              <Link href="/menschen" className="inline-flex min-h-11 items-center underline underline-offset-4">
                Menschen finden
              </Link>
            </p>
          </div>
        ) : (
          <ul className="mt-2">
            {people.map((p) => (
              <li key={p.userId} className="flex min-h-16 items-center gap-3 border-b py-2">
                <Link href={`/person/${p.userId}`} className="group flex min-w-0 flex-1 items-center gap-3">
                  <Avatar path={p.avatarUrl} name={p.name} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium group-hover:underline group-hover:underline-offset-4">
                      {p.name}
                    </span>
                    {tab.list === "followers" && !p.followsBack && (
                      <span className="text-muted-foreground block text-sm">Folgst du nicht</span>
                    )}
                    {tab.list === "following" && p.followsBack && (
                      <span className="text-muted-foreground block text-sm">Folgt dir</span>
                    )}
                  </span>
                </Link>
                {tab.list === "requests" && <FollowRequestButtons personId={p.userId} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
