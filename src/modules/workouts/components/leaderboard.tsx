import { cn } from "@/lib/utils";

import type { LeaderboardRow } from "../logic";
import { WeekGrid } from "./week-grid";

export function Leaderboard({ rows }: { rows: readonly LeaderboardRow[] }) {
  return (
    <ol>
      {rows.map((row, index) => (
        <li key={row.userId} className="flex min-h-14 items-center gap-3 border-b">
          <span className="text-muted-foreground w-6 text-sm">{index + 1}</span>
          <span className={cn("min-w-0 flex-1 truncate", row.isMe && "text-brand")}>
            {row.isMe ? "Du" : row.name}
          </span>
          <WeekGrid days={row.days} own={row.isMe} />
          <span className={cn("num-display w-8 text-right text-2xl", row.isMe && "text-brand")}>
            {row.count}
          </span>
        </li>
      ))}
    </ol>
  );
}
