import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MeetupDate } from "@/modules/core/components/meetup-list";
import { badgeCount, chatListTime } from "@/modules/core/logic";
import { getMyChats } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Chats" };

export default async function ChatsPage() {
  const all = await getMyChats();
  const requests = all.filter((c) => c.request === "incoming");
  const chats = all.filter((c) => c.request !== "incoming");
  const now = new Date();

  return (
    <>
      <h1 className="text-titel font-semibold">Chats</h1>

      {requests.length > 0 && (
        <section className="mt-6 max-w-2xl" aria-labelledby="anfragen">
          <h2 id="anfragen" className="text-xl font-semibold">
            Nachrichtenanfragen
          </h2>
          <ul className="mt-2" aria-label="Nachrichtenanfragen">
            {requests.map((chat) => (
              <li key={chat.id} className="border-b">
                <Link
                  href={`/chats/${chat.id}`}
                  className="hover:bg-accent -mx-2 flex min-h-16 items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-150 ease-out"
                >
                  <Avatar path={chat.otherAvatarUrl} name={chat.title} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{chat.title}</span>
                    <span className="block truncate text-sm">{chat.last?.body ?? "möchte dir schreiben"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {chats.length === 0 && requests.length === 0 ? (
        <div className="mt-8 max-w-xl">
          <p>
            Noch keine Chats. Jede Community hat einen Chat, zu jedem Training, bei dem du dabei bist, gibt es einen,
            und über das Profil einer Person kannst du ihr privat schreiben.
          </p>
          <Button asChild className="mt-6 w-full md:w-auto">
            <Link href="/gruppen">Communities ansehen</Link>
          </Button>
        </div>
      ) : chats.length === 0 ? null : (
        <ul className={cn("max-w-2xl", requests.length > 0 ? "mt-8" : "mt-4")} aria-label="Deine Chats">
          {chats.map((chat) => {
            const preview = chat.last
              ? chat.kind === "direct" && !chat.last.isMe
                ? chat.last.body
                : `${chat.last.isMe ? "Du" : chat.last.name}: ${chat.last.body}`
              : chat.kind === "meetup"
                ? "Noch keine Nachrichten. Sprecht euch ab, wo ihr euch trefft."
                : "Noch keine Nachrichten.";
            const unread = chat.unread > 0;
            return (
              <li key={chat.id} className="border-b">
                <Link
                  href={`/chats/${chat.id}`}
                  className="hover:bg-accent -mx-2 flex min-h-18 items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-150 ease-out"
                >
                  {chat.kind === "meetup" && chat.startsAt ? (
                    <MeetupDate startsAt={chat.startsAt} />
                  ) : (
                    <Avatar path={chat.kind === "direct" ? chat.otherAvatarUrl : null} name={chat.title} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {chat.title}
                        <span className="sr-only">
                          {chat.kind === "meetup"
                            ? ", Training"
                            : chat.kind === "community"
                              ? ", Community"
                              : ", privat"}
                        </span>
                      </span>
                      {chat.request === "outgoing" ? (
                        <span className="text-muted-foreground shrink-0 text-sm">Angefragt</span>
                      ) : (
                        chat.last && (
                          <span
                            className={cn(
                              "num shrink-0 text-sm",
                              unread ? "text-foreground font-medium" : "text-muted-foreground",
                            )}
                          >
                            {chatListTime(chat.last.at, now)}
                          </span>
                        )
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm",
                          unread ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {preview}
                      </span>
                      {unread && (
                        <span className="bg-foreground text-primary-foreground num flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-xs font-medium">
                          {badgeCount(chat.unread)}
                          <span className="sr-only"> ungelesen</span>
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
