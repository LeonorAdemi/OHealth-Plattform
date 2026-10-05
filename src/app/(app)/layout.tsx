import { AppNav } from "@/components/app-nav";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/modules/core/components/notification-bell";
import { ProfileLink } from "@/modules/core/components/profile-link";
import { UnreadChatsBadge } from "@/modules/core/components/unread-chats-badge";
import { getProfile, getUnreadChatCount, getUnreadNotificationCount } from "@/modules/core/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, unread, unreadChats] = await Promise.all([
    getProfile(),
    getUnreadNotificationCount(),
    getUnreadChatCount(),
  ]);
  const badges = { "/chats": <UnreadChatsBadge initialCount={unreadChats} /> };

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r px-3 py-6 md:flex">
        <div className="px-3">
          <Logo variant="mark" />
        </div>
        <nav aria-label="Hauptnavigation" className="mt-8">
          <AppNav variant="side" badges={badges} />
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-5 pt-2 pb-28 md:px-10 md:pt-6 md:pb-10">
        {/* Oben rechts: Mitteilungen und das eigene Profil, auf dem Handy und am Desktop */}
        <div className="-mr-3 flex items-center justify-end gap-1 md:-mr-4">
          <NotificationBell initialCount={unread} />
          <ProfileLink path={profile.avatar_url} name={profile.display_name} />
        </div>
        <div className="max-w-[960px]">{children}</div>
      </main>

      <nav
        aria-label="Hauptnavigation"
        className="bg-background fixed inset-x-0 bottom-0 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <AppNav variant="tabs" badges={badges} />
      </nav>
    </div>
  );
}
