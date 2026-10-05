"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Auswahl-Chip nach DESIGN.md: Umriss mit 8 px Rundung. Gewählt: Rahmen und Schrift in Eisen mit
 * Häkchen, nicht gefüllt. Nicht gewählt: Rahmen in Linie, Schrift in Stein.
 */
export function ChoiceChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors duration-150 ease-out md:min-h-9",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        selected ? "border-foreground text-foreground font-medium" : "border-input text-muted-foreground hover:bg-accent",
      )}
    >
      {selected && <Check size={16} strokeWidth={1.5} aria-hidden />}
      {children}
    </button>
  );
}
