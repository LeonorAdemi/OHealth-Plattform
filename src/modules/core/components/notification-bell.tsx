"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchUnreadCount } from "../actions";
import { badgeCount } from "../logic";
import { NOTIFICATIONS_READ } from "./notification-actions";

const REFRESH_MS = 30_000;

/**
 * Glocke mit Zahl der ungelesenen Mitteilungen. Fragt alle 30 Sekunden nach, solange die
 * Seite sichtbar ist, und beim Zurückkehren in die App.
 */
export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const pathname = usePathname();
  const active = pathname.startsWith("/mitteilungen");

  // Neuer Wert vom Server (nach dem Neuladen einer Seite): übernehmen, ohne Effekt.
  const [serverCount, setServerCount] = useState(initialCount);
  if (initialCount !== serverCount) {
    setServerCount(initialCount);
    setCount(initialCount);
  }

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") fetchUnreadCount().then(setCount, () => {});
    };
    const reset = () => setCount(0);
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener(NOTIFICATIONS_READ, reset);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener(NOTIFICATIONS_READ, reset);
    };
  }, []);

  const label = count > 0 ? `Mitteilungen, ${count} ungelesen` : "Mitteilungen";
  const badge = count > 0 && (
    <span
      aria-hidden
      className="bg-foreground text-primary-foreground num absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium"
    >
      {badgeCount(count)}
    </span>
  );

  return (
    <Link
      href="/mitteilungen"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="hover:bg-accent relative inline-flex size-11 items-center justify-center rounded-lg"
    >
      <Bell size={20} strokeWidth={1.5} aria-hidden />
      {badge}
    </Link>
  );
}
