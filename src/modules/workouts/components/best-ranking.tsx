import { cn } from "@/lib/utils";

import type { BestRankingRow } from "../logic";

// Rangliste der Bestwerte einer Übung, im selben Aufbau wie die Konstanz-Rangliste.
export function BestRanking({ rows }: { rows: readonly BestRankingRow[] }) {
  return (
    <ol>
      {rows.map((row, index) => (
        <li key={row.userId} className="flex min-h-14 items-center gap-3 border-b py-2">
          <span className="text-muted-foreground w-6 text-sm">{index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate", row.isMe && "text-brand")}>
              {row.isMe ? "Du" : row.name}
            </span>
            {row.detail && (
              <span className="text-muted-foreground block truncate text-sm">{row.detail}</span>
            )}
          </span>
          <span className={cn("num-display text-2xl", row.isMe && "text-brand")}>{row.value}</span>
          <span className="text-muted-foreground w-9 text-sm">{row.unit}</span>
        </li>
      ))}
    </ol>
  );
}
