"use client";

import { ArrowUp, Check, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useLayoutEffect, useOptimistic, useRef, useState } from "react";

import type { FormState } from "@/lib/result";
import { cn } from "@/lib/utils";

import { deleteChatMessage, sendChatMessage } from "../actions";
import { chatTime, layoutChat } from "../logic";

export type ChatMessage = { id: string; userId: string; name: string; body: string; createdAt: string; isMe: boolean };
type Shown = ChatMessage & { pending?: boolean };

const REFRESH_MS = 4_000;
const initial: FormState = {};

/**
 * Chat im Messenger-Stil: eigene Nachrichten rechts in Eisen, andere links in Nebel, Tagestrenner,
 * Folgen derselben Person zusammengefasst. Gesendete Nachrichten erscheinen sofort (mit Uhr, bis
 * der Server sie bestätigt). Neue Nachrichten holt die Seite alle vier Sekunden, solange sie sichtbar ist.
 */
export function MeetupChat({
  chatId,
  meetupId,
  myUserId,
  messages,
  now,
}: {
  chatId: string;
  meetupId: string;
  myUserId: string;
  messages: readonly ChatMessage[];
  now: string;
}) {
  const router = useRouter();
  const [optimistic, addOptimistic] = useOptimistic<Shown[], Shown>([...messages], (state, m) =>
    state.some((x) => x.id === m.id) ? state : [...state, m],
  );
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const listEnd = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);

  // Neue Nachrichten holen
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  // Merken, ob man unten ist; nur dann bei neuen Nachrichten mitscrollen
  useEffect(() => {
    const onScroll = () => {
      nearBottom.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const lastId = optimistic.at(-1)?.id;
  useLayoutEffect(() => {
    if (nearBottom.current) listEnd.current?.scrollIntoView({ block: "end" });
  }, [lastId]);

  // Eingabefeld wächst mit, bis fünf Zeilen
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  function send() {
    const body = text.trim();
    if (!body) return;
    const id = crypto.randomUUID();
    const formData = new FormData();
    formData.set("id", id);
    formData.set("chatId", chatId);
    formData.set("meetupId", meetupId);
    formData.set("body", body);
    setText("");
    setError(null);
    nearBottom.current = true;
    startTransition(async () => {
      addOptimistic({ id, userId: myUserId, name: "", body, createdAt: new Date().toISOString(), isMe: true, pending: true });
      const result = await sendChatMessage(initial, formData);
      if (result.error) {
        setError(result.error);
        setText(body);
      }
    });
    input.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Am Rechner sendet Enter, Umschalt+Enter macht eine neue Zeile. Am Handy macht Enter eine neue Zeile.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      if (!window.matchMedia("(pointer: coarse)").matches) {
        event.preventDefault();
        send();
      }
    }
  }

  const rows = layoutChat(optimistic, new Date(now));

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 pb-4" aria-live="polite">
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            Noch keine Nachrichten. Schreib den anderen, zum Beispiel wo ihr euch genau trefft.
          </p>
        ) : (
          <ol aria-label="Nachrichten" className="space-y-0.5">
            {rows.map(({ message: m, dayLabel, firstInGroup, lastInGroup }) => (
              <li key={m.id} className={cn(firstInGroup && "pt-2")}>
                {dayLabel && (
                  <p className="flex justify-center py-3">
                    <span className="text-muted-foreground bg-muted rounded-full px-3 py-1 text-xs font-medium">
                      {dayLabel}
                    </span>
                  </p>
                )}
                <div className={cn("flex", m.isMe ? "justify-end" : "justify-start")}>
                  <div className="max-w-[80%] md:max-w-[65%]">
                    <button
                      type="button"
                      disabled={!m.isMe || m.pending}
                      onClick={() => setSelected(selected === m.id ? null : m.id)}
                      aria-expanded={m.isMe ? selected === m.id : undefined}
                      className={cn(
                        "block w-full rounded-2xl px-3 py-2 text-left disabled:cursor-default",
                        m.isMe ? "bg-foreground text-primary-foreground" : "bg-muted text-foreground",
                        lastInGroup && (m.isMe ? "rounded-br-md" : "rounded-bl-md"),
                      )}
                    >
                      {!m.isMe && firstInGroup && <span className="mb-0.5 block text-xs font-semibold">{m.name}</span>}
                      <span className="break-words whitespace-pre-line">{m.body}</span>
                      <span
                        className={cn(
                          "num float-right mt-1.5 ml-3 inline-flex items-center gap-1 text-[11px] leading-none",
                          m.isMe ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {chatTime(m.createdAt)}
                        {m.isMe &&
                          (m.pending ? (
                            <Clock size={12} strokeWidth={1.5} aria-label="wird gesendet" />
                          ) : (
                            <Check size={12} strokeWidth={1.5} aria-label="gesendet" />
                          ))}
                      </span>
                    </button>
                    {m.isMe && selected === m.id && !m.pending && (
                      <DeleteMessage id={m.id} meetupId={meetupId} onDone={() => setSelected(null)} />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div ref={listEnd} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        className="bg-background sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-5 border-t px-3 py-2 md:bottom-0 md:mx-0 md:px-0"
      >
        {error && (
          <p role="alert" className="text-destructive px-2 pb-2 text-sm">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="body" className="sr-only">
            Nachricht
          </label>
          <textarea
            ref={input}
            id="body"
            name="body"
            rows={1}
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Nachricht"
            autoComplete="off"
            enterKeyHint="send"
            className="border-input placeholder:text-muted-foreground focus-visible:outline-ring min-h-11 flex-1 resize-none rounded-3xl border px-4 py-2.5 text-base leading-6 focus-visible:outline-2 focus-visible:outline-offset-2"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Senden"
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-ring inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
          >
            <ArrowUp size={20} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteMessage({ id, meetupId, onDone }: { id: string; meetupId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  return (
    <p className="flex justify-end">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          const formData = new FormData();
          formData.set("id", id);
          formData.set("meetupId", meetupId);
          startTransition(async () => {
            await deleteChatMessage(initial, formData);
            onDone();
          });
        }}
        className="text-muted-foreground inline-flex min-h-11 items-center text-sm underline underline-offset-4"
      >
        Nachricht löschen
      </button>
    </p>
  );
}
