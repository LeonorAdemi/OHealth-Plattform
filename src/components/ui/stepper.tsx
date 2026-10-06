"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Zahl mit Minus und Plus, etwa „3×“ für ein Vorhaben pro Woche. Umriss mit 8 px Rundung wie die
 * Eingaben, Tippflächen 44 px, die Zahl mit Tabellenziffern.
 */
export function Stepper({
  value,
  onChange,
  label,
  min = 0,
  max = 14,
  suffix = "×",
}: {
  value: number;
  onChange: (value: number) => void;
  /** Wofür die Zahl steht, für Screenreader („Laufen pro Woche“) */
  label: string;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const button =
    "text-foreground hover:bg-accent inline-flex size-11 items-center justify-center rounded-lg transition-colors duration-150 ease-out disabled:text-muted-foreground disabled:hover:bg-transparent";
  return (
    <span role="group" aria-label={label} className="border-input inline-flex items-center rounded-lg border">
      <button
        type="button"
        className={button}
        aria-label={`${label}: weniger`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus size={20} strokeWidth={1.5} aria-hidden />
      </button>
      <output aria-live="polite" className={cn("num w-10 text-center font-medium", value === 0 && "text-muted-foreground")}>
        {value}
        {suffix}
      </output>
      <button
        type="button"
        className={button}
        aria-label={`${label}: mehr`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus size={20} strokeWidth={1.5} aria-hidden />
      </button>
    </span>
  );
}
