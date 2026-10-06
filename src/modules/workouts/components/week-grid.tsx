import { cn } from "@/lib/utils";

import { goalSlots } from "../logic";

// Signatur-Element aus docs/DESIGN.md, Abschnitt 6: sieben Quadrate, Montag bis Sonntag.
export function WeekGrid({
  days,
  own = false,
  size = "sm",
  decorative = false,
}: {
  days: readonly boolean[];
  own?: boolean;
  size?: "sm" | "lg";
  /** Ohne eigene Beschriftung, wenn daneben die Zahl als Text steht (Übersicht der Wochen). */
  decorative?: boolean;
}) {
  const count = days.filter(Boolean).length;

  return (
    <span
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": `${count} von 7 Tagen trainiert` })}
      className={cn("inline-flex", size === "lg" ? "gap-1.5" : "gap-1")}
    >
      {days.map((trained, index) => (
        <span
          key={index}
          className={cn(
            size === "lg" ? "size-4 rounded-[3px]" : "size-2.5 rounded-[2px]",
            trained ? (own ? "bg-brand" : "bg-foreground") : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

/**
 * Wochenraster mit Ziel (docs/DESIGN.md, Abschnitt 6): sieben Felder wie das Wochenraster. Von links
 * zuerst die Trainingstage in Moos, dann bis zum Ziel offene Felder mit Rahmen in Eisen, danach leer.
 * So füllt sich das Ziel mit jedem Trainingstag.
 */
export function GoalGrid({ count, goal }: { count: number; goal: number }) {
  return (
    <span role="img" aria-label={`${count} von ${goal} Trainingstagen`} className="inline-flex gap-1.5">
      {goalSlots(count, goal).map((slot, index) => (
        <span
          key={index}
          className={cn(
            "size-4 rounded-[3px]",
            slot === "done" ? "bg-brand" : slot === "open" ? "border-foreground border-[1.5px]" : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}
