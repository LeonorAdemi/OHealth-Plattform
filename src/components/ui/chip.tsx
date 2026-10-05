import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Auswahl-Chip (zum Beispiel Sportart oder Anstrengung): Umriss, gewählt mit Häkchen und Rahmen in Eisen.
 * Gestaltung nach DESIGN.md, Abschnitt Komponenten.
 */
export function Chip({
  selected,
  onClick,
  disabled,
  className,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors duration-150 ease-out disabled:opacity-50 md:min-h-9",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        selected ? "border-foreground text-foreground font-medium" : "border-input text-muted-foreground hover:bg-accent",
        className,
      )}
    >
      {selected && <Check size={16} strokeWidth={1.5} aria-hidden />}
      {children}
    </button>
  );
}
