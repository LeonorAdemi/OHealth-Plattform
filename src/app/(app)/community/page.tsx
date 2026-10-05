import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JoinPublicButton, JoinWithCodeForm } from "@/modules/core/components/community-forms";
import { MeetupList } from "@/modules/core/components/meetup-list";
import { COMMUNITY_KIND_LABEL, describeCommunity } from "@/modules/core/logic";
import { getChatSummaries, getMeetups, getMyCommunities, searchCommunities } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 60);
  const now = new Date();
  const [mine, meetups, found, chats] = await Promise.all([
    getMyCommunities(),
    getMeetups("communities", { from: now, limit: 5 }),
    searchCommunities(query, 20),
    getChatSummaries(),
  ]);
  const discover = found.filter((c) => !c.isMember);

  return (
    <>
      <h1 className="text-titel font-semibold">Community</h1>

      <p className="mt-4 max-w-2xl border-y">
        <Link
          href="/menschen"
          className="hover:bg-accent -mx-2 flex min-h-14 items-center gap-3 rounded-lg px-2 transition-colors duration-150 ease-out"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Menschen finden</span>
            <span className="text-muted-foreground block text-sm">Folge anderen und sieh ihre Trainings und Events</span>
          </span>
          <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground shrink-0" aria-hidden />
        </Link>
      </p>

      {mine.length > 0 && (
        <section className="mt-8 max-w-2xl" aria-labelledby="treffen">
          <h2 id="treffen" className="text-xl font-semibold">
            Gemeinsam trainieren
          </h2>
          {meetups.length === 0 ? (
            <p className="text-muted-foreground mt-2">
              Noch keine geteilten Trainings in deinen Communities. Plane eins und teile es, dann können andere mitmachen.
            </p>
          ) : (
            <div className="mt-2">
              <MeetupList label="Gemeinsam trainieren" meetups={meetups} chats={chats.byMeetup} />
            </div>
          )}
        </section>
      )}

      <section className="mt-10 max-w-2xl" aria-labelledby="deine">
        <h2 id="deine" className="text-xl font-semibold">
          Deine Communities
        </h2>
        {mine.length === 0 ? (
          <p className="text-muted-foreground mt-2">
            Noch in keiner Community. Tritt unten einer bei oder erstelle deine eigene.
          </p>
        ) : (
          <ul className="mt-2" aria-label="Deine Communities">
            {mine.map((c) => (
              <li key={c.id} className="border-b">
                <Link
                  href={`/community/${c.id}`}
                  className="hover:bg-accent -mx-2 flex min-h-16 items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-150 ease-out"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="text-muted-foreground mt-0.5 block text-sm">
                      {COMMUNITY_KIND_LABEL[c.kind]} · {describeCommunity(c)}
                    </span>
                  </span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 max-w-2xl" aria-labelledby="entdecken">
        <h2 id="entdecken" className="text-xl font-semibold">
          Entdecken
        </h2>
        <form action="/community" method="get" className="mt-3 space-y-2" role="search">
          <Label htmlFor="q">Öffentliche Communities suchen</Label>
          <div className="flex gap-3">
            <Input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              maxLength={60}
              placeholder="z. B. Laufen München"
              enterKeyHint="search"
            />
            <Button type="submit" variant="outline">
              Suchen
            </Button>
          </div>
        </form>

        {discover.length === 0 ? (
          <p className="text-muted-foreground mt-4">
            {query
              ? "Keine öffentliche Community gefunden. Erstelle die erste für deine Sportart."
              : "Noch keine weiteren öffentlichen Communities. Erstelle die erste."}
          </p>
        ) : (
          <ul className="mt-2" aria-label={query ? "Suchergebnis" : "Öffentliche Communities"}>
            {discover.map((c) => (
              <li key={c.id} className="flex min-h-16 items-center justify-between gap-4 border-b py-3">
                <span className="min-w-0">
                  <span className="block font-medium">{c.name}</span>
                  <span className="text-muted-foreground mt-0.5 block text-sm">{describeCommunity(c)}</span>
                </span>
                <span className="shrink-0">
                  <JoinPublicButton id={c.id} name={c.name} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 max-w-2xl space-y-4">
        <Button asChild className="w-full md:w-auto">
          <Link href="/community/neu">Community erstellen</Link>
        </Button>
        <details>
          <summary className="text-muted-foreground min-h-11 cursor-pointer py-2 text-sm underline underline-offset-4">
            Mit Link oder Code beitreten
          </summary>
          <p className="text-muted-foreground mt-1 mb-3 text-sm">
            Öffne den Link, den du bekommen hast, oder gib den Code ein.
          </p>
          <JoinWithCodeForm />
        </details>
      </div>
    </>
  );
}
