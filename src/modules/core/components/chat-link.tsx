import { ChevronRight, MessageCircle } from "lucide-react";
import Link from "next/link";

import { badgeCount } from "../logic";
import type { ChatSummary } from "../queries";

function Unread({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="bg-foreground text-primary-foreground num flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-xs font-medium">
      {badgeCount(count)}
      <span className="sr-only"> ungelesen</span>
    </span>
  );
}

/** Zeile zum Chat einer Community oder eines Trainings: letzte Nachricht und ungelesene Nachrichten. */
export function ChatRow({ chat, label, emptyText }: { chat: ChatSummary; label: string; emptyText: string }) {
  return (
    <Link
      href={`/chats/${chat.id}`}
      className="hover:bg-accent -mx-2 flex min-h-16 items-center gap-3 rounded-lg border-b px-2 py-3 transition-colors duration-150 ease-out"
    >
      <MessageCircle size={20} strokeWidth={1.5} className="shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        <span className={chat.unread > 0 ? "block truncate text-sm" : "text-muted-foreground block truncate text-sm"}>
          {chat.preview ?? emptyText}
        </span>
      </span>
      <Unread count={chat.unread} />
      <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground shrink-0" aria-hidden />
    </Link>
  );
}

/** Kurze Chat-Zeile unter einem Training in einer Liste. */
export function ChatLine({ chat, title }: { chat: ChatSummary; title: string }) {
  return (
    <Link
      href={`/chats/${chat.id}`}
      aria-label={`Chat zu ${title}${chat.unread > 0 ? `, ${chat.unread} ungelesen` : ""}`}
      className="group -my-1.5 flex min-h-11 max-w-full items-center gap-1.5 text-sm"
    >
      <MessageCircle size={16} strokeWidth={1.5} className="shrink-0" aria-hidden />
      <span
        className={
          chat.unread > 0
            ? "min-w-0 truncate group-hover:underline group-hover:underline-offset-4"
            : "text-muted-foreground min-w-0 truncate group-hover:underline group-hover:underline-offset-4"
        }
      >
        {chat.preview ?? "Zum Chat"}
      </span>
      <span aria-hidden className="flex">
        <Unread count={chat.unread} />
      </span>
    </Link>
  );
}
