"use client";

import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { Button } from "@/components/ui/button";

/**
 * Knopf „Filter“ mit der Zahl gewählter Filter, der am Handy alle Filter als Blatt von unten öffnet.
 * Die Filter darin sind Links: Die Seite lädt dahinter neu, das Blatt bleibt offen und der Knopf
 * unten nennt die neue Trefferzahl.
 */
export function FilterSheet({
  active,
  result,
  resetHref,
  children,
}: {
  active: number;
  /** Beschriftung des Knopfs unten, etwa „52 Pläne anzeigen“ */
  result: string;
  resetHref: string | null;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="border-input text-foreground hover:bg-accent inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors duration-150 ease-out lg:hidden"
      >
        <SlidersHorizontal size={20} strokeWidth={1.5} aria-hidden />
        Filter
        {active > 0 && (
          <span className="bg-primary text-primary-foreground num inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium">
            <span className="sr-only">, gewählt: </span>
            {active}
          </span>
        )}
      </button>

      {/* Ein Tipp neben das Blatt (auf den Hintergrund) schließt es, Escape ebenso. */}
      <dialog
        ref={dialog}
        aria-labelledby="filter-titel"
        onClick={(e) => e.target === e.currentTarget && close()}
        className="bg-background text-foreground backdrop:bg-foreground/40 m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-lg p-0 shadow-lg md:m-auto md:max-w-lg md:rounded-lg"
      >
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-2">
            <h2 id="filter-titel" className="text-xl font-semibold">
              Filter
            </h2>
            <div className="flex items-center gap-1">
              {resetHref && (
                <Link
                  href={resetHref}
                  replace
                  scroll={false}
                  className="inline-flex min-h-11 items-center px-2 text-sm underline underline-offset-4"
                >
                  Zurücksetzen
                </Link>
              )}
              <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Filter schließen">
                <X strokeWidth={1.5} aria-hidden />
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5">{children}</div>
          <div className="border-t px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button type="button" onClick={close} className="w-full">
              {result}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
