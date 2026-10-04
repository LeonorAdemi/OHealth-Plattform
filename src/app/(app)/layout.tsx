import Link from "next/link";

import { AppNav } from "@/components/app-nav";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/modules/core/components/notification-bell";
import { getProfile, getUnreadNotificationCount } from "@/modules/core/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, unread] = await Promise.all([getProfile(), getUnreadNotificationCount()]);

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r px-3 py-6 md:flex">
        <div className="px-3">
          <Logo variant="mark" />
        </div>
        <nav aria-label="Hauptnavigation" className="mt-8">
          <AppNav variant="side" />
        </nav>
        <div className="mt-6">
          <NotificationBell initialCount={unread} variant="side" />
        </div>
        <Link
          href="/profil"
          className="hover:bg-accent mt-auto flex min-h-10 items-center rounded-lg px-3 transition-colors duration-150 ease-out"
        >
          <span className="truncate">{profile.display_name}</span>
        </Link>
      </aside>

      <main className="relative min-w-0 flex-1 px-5 pt-8 pb-28 md:px-10 md:py-10">
        <div className="absolute top-3 right-3 md:hidden">
          <NotificationBell initialCount={unread} variant="icon" />
        </div>
        <div className="max-w-[960px]">{children}</div>
        <p className="mt-16 md:hidden">
          <Link
            href="/profil"
            className="text-muted-foreground inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            {profile.display_name}, Profil
          </Link>
        </p>
      </main>

      <nav
        aria-label="Hauptnavigation"
        className="bg-background fixed inset-x-0 bottom-0 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <AppNav variant="tabs" />
      </nav>
    </div>
  );
}
