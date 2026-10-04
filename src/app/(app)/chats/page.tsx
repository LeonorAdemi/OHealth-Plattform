import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { badgeCount, chatListTime, meetupDateBlock } from "@/modules/core/logic";
import { getMyChats } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Chats" };

export default async function ChatsPage() {
  const chats = await getMyChats();
  const now = new Date();

  return (
    <>
      <h1 className="text-titel font-semibold">Chats</h1>

      {chats.length === 0 ? (
        <div className="mt-8 max-w-xl">
          <p>
            Noch keine Chats. Jede Community hat einen Chat, und zu jedem Training, bei dem du dabei bist, gibt es
            einen.
          </p>
          <Button asChild className="mt-6 w-full md:w-auto">
            <Link href="/community">Communities ansehen</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-4 max-w-2xl" aria-label="Deine Chats">
          {chats.map((chat) => {
            const block = chat.kind === "meetup" && chat.startsAt ? meetupDateBlock(chat.startsAt) : null;
            const preview = chat.last
              ? `${chat.last.isMe ? "Du" : chat.last.name}: ${chat.last.body}`
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
                  {block ? (
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg border leading-none"
                    >
                      <span className="num text-base font-semibold">{block.day}</span>
                      <span className="text-muted-foreground text-xs">{block.month}</span>
                    </span>
                  ) : (
                    <Avatar path={null} name={chat.title} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {chat.title}
                        <span className="sr-only">{chat.kind === "meetup" ? ", Training" : ", Community"}</span>
                      </span>
                      {chat.last && (
                        <span
                          className={cn(
                            "num shrink-0 text-sm",
                            unread ? "text-foreground font-medium" : "text-muted-foreground",
                          )}
                        >
                          {chatListTime(chat.last.at, now)}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span
                        className={cn("min-w-0 flex-1 truncate text-sm", unread ? "text-foreground" : "text-muted-foreground")}
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
