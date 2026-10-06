"use client";

import { Check } from "lucide-react";
import { useLayoutEffect, useRef } from "react";

import { SPORT_CATEGORY_COLOR, type SportCategory } from "@/modules/core/logic";

// Kreis mit pathLength 360: Längen und Abstände in Grad
const GAP = 14;
const SIZE = 200;
const RADIUS = 86;
const STROKE = 16;
const FILL_MS = 600;
const STAGGER_MS = 120;

// Auf dem Gerät gemerkt (nur Komfort): wie viele Segmente zuletzt zu sehen waren und ob das
// Erreichen des Ziels in dieser Woche schon gezeigt wurde. Ohne Speicher wird alles einmal animiert.
const seenKey = (week: string) => `ohealth-ring-${week}`;
const celebratedKey = (week: string) => `ohealth-ziel-${week}`;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Privates Fenster oder gesperrter Speicher: dann eben ohne Merken
  }
}

/**
 * Wochenring (docs/DESIGN.md, Abschnitt 6): je Segment ein Trainingstag in der Farbe seiner
 * Sportart, offene Segmente bis zum Ziel in Nebel. Neue Segmente seit dem letzten Besuch füllen
 * sich nacheinander; ist das Ziel neu erreicht, erscheint einmal pro Woche ein Hinweis.
 * Der Server zeichnet den fertigen Stand; die Animation setzt nur das Gerät, direkt am SVG.
 */
export function GoalRing({
  segments,
  count,
  goal,
  week,
  label,
  streak,
}: {
  segments: readonly (SportCategory | null)[];
  count: number;
  goal: number | null;
  /** Montag der Woche ("JJJJ-MM-TT"), Schlüssel für das Merken */
  week: string;
  label: string;
  /** Wochen in Folge mit erreichtem Ziel, für den Hinweis beim Erreichen */
  streak: number;
}) {
  const ringRef = useRef<HTMLDivElement>(null);
  const celebrationRef = useRef<HTMLParagraphElement>(null);
  const filled = segments.filter(Boolean).length;
  const step = 360 / segments.length;
  const arc = Math.max(4, step - GAP);
  const reached = goal !== null && count >= goal;

  // Vor dem ersten Zeichnen: neue Segmente leeren und dann nacheinander füllen
  useLayoutEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const seen = Math.max(0, Number(read(seenKey(week)) ?? 0));
    write(seenKey(week), String(filled));

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fresh = [...ring.querySelectorAll<SVGCircleElement>("[data-segment]")].filter(
      (el) => Number(el.dataset.segment) >= seen,
    );
    if (!reduce && fresh.length > 0) {
      for (const el of fresh) {
        el.style.transition = "none";
        el.style.strokeDasharray = "0 360";
      }
      // Erzwingt das Zeichnen des leeren Zustands, bevor die Übergänge starten
      void ring.getBoundingClientRect();
      fresh.forEach((el, i) => {
        el.style.transition = `stroke-dasharray ${FILL_MS}ms ease-out ${i * STAGGER_MS}ms`;
        el.style.strokeDasharray = "";
      });
    }

    if (reached && read(celebratedKey(week)) === null) {
      const delay = reduce ? 0 : fresh.length * STAGGER_MS + FILL_MS;
      const timer = window.setTimeout(() => {
        // Erst merken, wenn der Hinweis wirklich erscheint (Effekte können doppelt laufen)
        write(celebratedKey(week), "1");
        celebrationRef.current?.removeAttribute("hidden");
        if (!reduce) ring.animate([{ scale: 1 }, { scale: 1.04 }, { scale: 1 }], { duration: 700, easing: "ease-out" });
      }, delay);
      return () => window.clearTimeout(timer);
    }
  }, [week, filled, reached]);

  return (
    <div className="flex flex-col items-start gap-4">
      <div ref={ringRef} className="relative size-44 shrink-0">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-90" role="img" aria-label={label}>
          {segments.map((category, i) => (
            <g key={i}>
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                pathLength={360}
                strokeWidth={STROKE}
                strokeLinecap="round"
                stroke="var(--color-muted)"
                strokeDasharray={`${arc} ${360 - arc}`}
                strokeDashoffset={-(i * step + GAP / 2)}
              />
              {category && (
                <circle
                  data-segment={i}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  pathLength={360}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  stroke={SPORT_CATEGORY_COLOR[category]}
                  strokeDasharray={`${arc} ${360 - arc}`}
                  strokeDashoffset={-(i * step + GAP / 2)}
                />
              )}
            </g>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
          <span className="num-display text-grosszahl">{count}</span>
          <span className="text-muted-foreground text-sm">{goal ? `von ${goal}` : count === 1 ? "Tag" : "Tage"}</span>
        </div>
      </div>
      {reached && (
        <p
          ref={celebrationRef}
          hidden
          role="status"
          className="bg-brand-subtle motion-safe:animate-[fade-up_400ms_ease-out] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium [&:not([hidden])]:inline-flex"
        >
          <Check size={20} strokeWidth={1.5} className="text-brand" aria-hidden />
          {streak > 1 ? `${streak} Wochen in Folge mit Wochenziel` : "Erste Woche mit erreichtem Wochenziel"}
        </p>
      )}
    </div>
  );
}
