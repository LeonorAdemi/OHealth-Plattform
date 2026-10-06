import { cn } from "@/lib/utils";

// Signatur-Element aus docs/DESIGN.md, Abschnitt 6: sieben Quadrate, Montag bis Sonntag.
export function WeekGrid({
  days,
  own = false,
  size = "sm",
}: {
  days: readonly boolean[];
  own?: boolean;
  size?: "sm" | "lg";
}) {
  const count = days.filter(Boolean).length;

  return (
    <span
      role="img"
      aria-label={`${count} von 7 Tagen trainiert`}
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
