"use client";

import { useLayoutEffect, useRef } from "react";

import { SPORT_CATEGORY_COLOR } from "@/modules/core/logic";
import { cn } from "@/lib/utils";

import { ringState, type WeekSport } from "../logic";

// Kreis mit pathLength 360: Längen und Abstände in Grad
const VIEW = 100;
const RADIUS = 42;
const STROKE = 9;
const GAP = 12;

// Zeiten der Animation in Millisekunden (docs/DESIGN.md, Abschnitt 11)
const FILL_MS = 500;
const STAGGER_MS = 150;
const CLOSE_MS = 500;
const CHECK_MS = 400;

// Auf dem Gerät gemerkt (nur Komfort): wie viele Aktivitäten je Sportart zuletzt zu sehen waren.
const seenKey = (week: string, sportId: string) => `ohealth-kreis-${week}-${sportId}`;

function readSeen(key: string): number {
  try {
    return Math.max(0, Number(window.localStorage.getItem(key) ?? 0) || 0);
  } catch {
    return 0;
  }
}

function writeSeen(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Privates Fenster oder gesperrter Speicher: dann eben ohne Merken
  }
}

/** Wie lang ein Segment ist und wo es beginnt (in Grad, oben beginnend im Uhrzeigersinn). */
function segmentGeometry(segments: number, index: number) {
  if (segments === 1) return { arc: 360, offset: 0 };
  const step = 360 / segments;
  return { arc: step - GAP, offset: -(index * step + GAP / 2) };
}

/**
 * Kreise je Sportart nebeneinander (docs/bereiche/heute.md). Jeder Kreis hat so viele Segmente,
 * wie man sich pro Woche vorgenommen hat, und füllt sich mit jeder Aktivität in der Farbe der
 * Sportart. Ist das Vorhaben erreicht, schließt er sich: Lücken zu, Häkchen in der Mitte.
 * Spontanes ohne Vorhaben steht als kleiner, voller Kreis dahinter.
 *
 * Der Server zeichnet den fertigen Stand. Auf dem Gerät spielen neue Aktivitäten seit dem letzten
 * Besuch ihre Animation ab: klein für jede Aktivität (Segment füllt sich, Kreis pulsiert), groß,
 * wenn ein Kreis sich schließt (Lücken schließen sich, Häkchen, Kreis wächst kurz, Welle).
 */
export function SportRings({ sports, week }: { sports: readonly WeekSport[]; week: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const closed: string[] = [];

    for (const sport of sports) {
      const key = seenKey(week, sport.sportId);
      const seen = readSeen(key);
      writeSeen(key, sport.done);
      if (sport.done <= seen || reduce) continue;

      const ring = list.querySelector<HTMLElement>(`[data-ring="${sport.sportId}"]`);
      if (!ring) continue;
      const state = ringState(sport);
      const fresh = [...ring.querySelectorAll<SVGCircleElement>("[data-seg]")].filter(
        (el) => Number(el.dataset.seg) >= seen,
      );
      const ripple = ring.querySelector<HTMLElement>("[data-ripple]");
      const body = ring.querySelector<HTMLElement>("[data-body]");

      // Klein: je neue Aktivität füllt sich ein Segment, der Kreis pulsiert, eine kleine Welle
      fresh.forEach((el, k) => {
        const { arc } = segmentGeometry(state.segments, Number(el.dataset.seg));
        const delay = k * STAGGER_MS;
        el.animate([{ strokeDasharray: "0 360" }, { strokeDasharray: `${arc} ${360 - arc}` }], {
          duration: FILL_MS,
          delay,
          easing: "ease-out",
          fill: "backwards",
        });
        body?.animate([{ scale: 1 }, { scale: 1.06 }, { scale: 1 }], { duration: 300, delay: delay + FILL_MS - 150 });
        ripple?.animate([{ scale: 1, opacity: 0.45 }, { scale: 1.25, opacity: 0 }], {
          duration: 500,
          delay: delay + FILL_MS - 150,
          easing: "ease-out",
        });
      });

      // Groß: Das Vorhaben ist mit diesem Besuch erreicht, der Kreis schließt sich
      const times = sport.times;
      if (times !== null && seen < times && sport.done >= times) {
        closed.push(sport.name);
        const start = fresh.length * STAGGER_MS + FILL_MS;
        ring.querySelector("[data-full]")?.animate(
          [{ strokeDasharray: "0 360" }, { strokeDasharray: "360 0" }],
          { duration: CLOSE_MS, delay: start, easing: "ease-in-out", fill: "backwards" },
        );
        ring.querySelector("[data-tint]")?.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: CLOSE_MS,
          delay: start,
          fill: "backwards",
        });
        ring.querySelector("[data-check]")?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
          duration: CHECK_MS,
          delay: start + CLOSE_MS - 100,
          easing: "ease-out",
          fill: "backwards",
        });
        body?.animate([{ scale: 1 }, { scale: 1.15 }, { scale: 1 }], {
          duration: 600,
          delay: start + CLOSE_MS - 100,
          easing: "ease-out",
        });
        ripple?.animate([{ scale: 1, opacity: 0.6 }, { scale: 1.7, opacity: 0 }], {
          duration: 800,
          delay: start + CLOSE_MS - 100,
          easing: "ease-out",
        });
      }
    }

    if (closed.length > 0 && statusRef.current) {
      statusRef.current.textContent = `${closed.join(" und ")}: Vorhaben dieser Woche geschafft.`;
    }
  }, [sports, week]);

  return (
    <>
      <ul ref={listRef} className="flex flex-wrap items-end gap-x-5 gap-y-6" aria-label="Vorhaben dieser Woche">
        {sports.map((sport) => (
          <li key={sport.sportId}>
            <Ring sport={sport} />
          </li>
        ))}
      </ul>
      <p ref={statusRef} role="status" className="sr-only" />
    </>
  );
}

function Ring({ sport }: { sport: WeekSport }) {
  const state = ringState(sport);
  const color = SPORT_CATEGORY_COLOR[sport.category];
  const spontaneous = sport.times === null;
  const label = spontaneous
    ? `${sport.name}: ${sport.done}× ohne Vorhaben`
    : `${sport.name}: ${sport.done} von ${sport.times}${state.complete ? ", geschafft" : ""}`;

  return (
    <div data-ring={sport.sportId} className="flex flex-col items-center gap-2">
      <div data-body className={cn("relative", spontaneous ? "size-16" : "size-24 md:size-28")}>
        <span
          data-ripple
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border-2 opacity-0"
          style={{ borderColor: color }}
        />
        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="size-full -rotate-90" role="img" aria-label={label}>
          {state.complete && (
            <circle data-tint cx={VIEW / 2} cy={VIEW / 2} r={RADIUS} fill={color} fillOpacity={0.1} />
          )}
          {Array.from({ length: state.segments }, (_, i) => {
            const { arc, offset } = segmentGeometry(state.segments, i);
            return (
              <g key={i}>
                <circle
                  cx={VIEW / 2}
                  cy={VIEW / 2}
                  r={RADIUS}
                  fill="none"
                  pathLength={360}
                  strokeWidth={spontaneous ? STROKE - 3 : STROKE}
                  strokeLinecap={state.segments === 1 ? "butt" : "round"}
                  stroke="var(--color-muted)"
                  strokeDasharray={`${arc} ${360 - arc}`}
                  strokeDashoffset={offset}
                />
                {i < state.filled && (
                  <circle
                    data-seg={i}
                    cx={VIEW / 2}
                    cy={VIEW / 2}
                    r={RADIUS}
                    fill="none"
                    pathLength={360}
                    strokeWidth={spontaneous ? STROKE - 3 : STROKE}
                    strokeLinecap={state.segments === 1 ? "butt" : "round"}
                    stroke={color}
                    strokeDasharray={`${arc} ${360 - arc}`}
                    strokeDashoffset={offset}
                  />
                )}
              </g>
            );
          })}
          {state.complete && (
            <circle
              data-full
              cx={VIEW / 2}
              cy={VIEW / 2}
              r={RADIUS}
              fill="none"
              pathLength={360}
              strokeWidth={STROKE}
              stroke={color}
              strokeDasharray="360 0"
            />
          )}
          {state.complete && (
            <path
              data-check
              d="M33 51 L45 63 L68 38"
              transform={`rotate(90 ${VIEW / 2} ${VIEW / 2})`}
              fill="none"
              stroke={color}
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={0}
            />
          )}
        </svg>
        {!state.complete && (
          <span aria-hidden className="absolute inset-0 flex items-center justify-center">
            {spontaneous ? (
              <span className="num text-sm font-semibold">{sport.done}×</span>
            ) : (
              <span className="num-display text-3xl">
                {sport.done}
                <span className="text-muted-foreground text-base">/{sport.times}</span>
              </span>
            )}
          </span>
        )}
      </div>
      <span aria-hidden className="flex max-w-28 flex-col items-center text-center">
        <span className={cn("leading-tight", spontaneous ? "text-xs" : "text-sm font-medium")}>{sport.name}</span>
        {!spontaneous && (
          <span className="text-muted-foreground num text-xs">
            {state.complete ? (state.extra > 0 ? `geschafft, +${state.extra}` : "geschafft") : `${sport.done} von ${sport.times}`}
          </span>
        )}
      </span>
    </div>
  );
}
