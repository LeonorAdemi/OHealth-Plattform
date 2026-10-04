"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchUnreadChatCount } from "../actions";
import { badgeCount } from "../logic";

const REFRESH_MS = 15_000;

/** Wird ausgelöst, sobald ein Chat als gelesen markiert ist; die Zahl am Tab fragt dann neu nach. */
export const CHAT_READ = "ohealth:chat-read";

/**
 * Zahl der Chats mit ungelesenen Nachrichten am Tab „Chats“. Fragt alle 15 Sekunden nach, solange die
 * Seite sichtbar ist, beim Zurückkehren in die App, beim Seitenwechsel und nach dem Lesen eines Chats.
 */
export function UnreadChatsBadge({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const pathname = usePathname();

  const [serverCount, setServerCount] = useState(initialCount);
  if (initialCount !== serverCount) {
    setServerCount(initialCount);
    setCount(initialCount);
  }

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") fetchUnreadChatCount().then(setCount, () => {});
    };
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener(CHAT_READ, refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener(CHAT_READ, refresh);
    };
  }, []);

  useEffect(() => {
    if (document.visibilityState === "visible") fetchUnreadChatCount().then(setCount, () => {});
  }, [pathname]);

  if (count === 0) return null;
  return (
    <>
      <span className="sr-only">{count === 1 ? "Ein Chat" : `${count} Chats`} mit neuen Nachrichten:</span>
      <span
        aria-hidden
        className="bg-foreground text-primary-foreground num flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium"
      >
        {badgeCount(count)}
      </span>
    </>
  );
}
