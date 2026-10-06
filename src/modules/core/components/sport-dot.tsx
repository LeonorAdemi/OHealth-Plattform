import { cn } from "@/lib/utils";

import { SPORT_CATEGORY_COLOR, type SportCategory } from "../logic";

/** Punkt in der Farbe der Sportart (docs/DESIGN.md, Abschnitt 4). Schmuck: Der Name steht daneben. */
export function SportDot({ category, className }: { category: SportCategory | null | undefined; className?: string }) {
  if (!category) return null;
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: SPORT_CATEGORY_COLOR[category] }}
    />
  );
}
