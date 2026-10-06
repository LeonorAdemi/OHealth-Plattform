import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { JoinWithCodeForm } from "@/modules/core/components/community-forms";
import { MeetupList } from "@/modules/core/components/meetup-list";
import { COMMUNITY_KIND_LABEL, describeCommunity } from "@/modules/core/logic";
import { getChatSummaries, getMeetups, getMyCommunities } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Gruppen" };

// Eigene Communities und Gruppen. Öffentliche Communities finden steht unter „Entdecken“.
export default async function GroupsPage() {
  const now = new Date();
  const [mine, meetups, chats] = await Promise.all([
    getMyCommunities(),
    getMeetups("communities", { from: now, limit: 5 }),
    getChatSummaries(),
  ]);

  return (
    <>
      <h1 className="text-titel font-semibold">Gruppen</h1>

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
            Noch in keiner Community.{" "}
            <Link href="/entdecken" className="text-foreground underline underline-offset-4">
              Entdecke Communities in deiner Stadt
            </Link>{" "}
            oder erstelle deine eigene.
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
