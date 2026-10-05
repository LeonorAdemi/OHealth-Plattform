import type { Metadata } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { MarkAllRead } from "@/modules/core/components/notification-actions";
import { MeetupList } from "@/modules/core/components/meetup-list";
import { REMINDER_HOURS, describeNotification, formatAgo } from "@/modules/core/logic";
import { getMeetups, getNotifications } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Mitteilungen" };

export default async function NotificationsPage() {
  const now = new Date();
  const [notifications, soon] = await Promise.all([
    getNotifications(50),
    getMeetups("mine", { from: now, to: new Date(now.getTime() + REMINDER_HOURS * 3600_000), limit: 5 }),
  ]);
  const unread = notifications.filter((n) => n.isUnread).length;

  return (
    <>
      <h1 className="text-titel font-semibold">Mitteilungen</h1>
      <MarkAllRead hasUnread={unread > 0} />

      {soon.length > 0 && (
        <section className="mt-8 max-w-2xl" aria-labelledby="gleich">
          <h2 id="gleich" className="text-xl font-semibold">
            Gleich
          </h2>
          <div className="mt-2">
            <MeetupList label="Gleich" meetups={soon} />
          </div>
        </section>
      )}

      <section className="mt-8 max-w-2xl" aria-labelledby="neu">
        <h2 id="neu" className={soon.length > 0 ? "text-xl font-semibold" : "sr-only"}>
          {unread > 0 ? `${unread} neu` : "Mitteilungen"}
        </h2>
        {notifications.length === 0 ? (
          <p className="text-muted-foreground mt-2">
            Noch keine Mitteilungen. Hier erscheint, wenn jemand ein Training teilt, bei deinem zusagt oder dir folgt.
          </p>
        ) : (
          <ul className="mt-2" aria-label="Mitteilungen">
            {notifications.map((n) => {
              const text = describeNotification(n);
              const content = (
                <>
                  <span className={cn("block break-words", n.isUnread && "font-medium")}>
                    {n.isUnread && <span className="sr-only">Neu: </span>}
                    {text}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-sm">
                    {n.isUnread ? "Neu · " : ""}
                    {formatAgo(n.createdAt, now)}
                  </span>
                </>
              );
              const href = n.meetupId
                ? `/plan/${n.meetupId}`
                : n.kind === "follow_request"
                  ? "/verbindungen?tab=anfragen"
                  : (n.kind === "new_follower" || n.kind === "follow_accepted") && n.actorId
                    ? `/person/${n.actorId}`
                    : null;
              return (
                <li key={n.id} className="border-b">
                  {href ? (
                    <Link
                      href={href}
                      className="hover:bg-accent -mx-2 block rounded-lg px-2 py-3 transition-colors duration-150 ease-out"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="py-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-6 text-sm">
          <Link href="/profil/einstellungen#mitteilungen" className="text-muted-foreground underline underline-offset-4">
            Einstellen, welche Mitteilungen du bekommst
          </Link>
        </p>
      </section>
    </>
  );
}
