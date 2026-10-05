import Link from "next/link";

import { cn } from "@/lib/utils";
import { topWithMe } from "@/modules/core/logic";

import type { LeaderboardRow } from "../logic";
import { WeekGrid } from "./week-grid";

/** Rangliste der Trainingstage. Mit limit: die ersten n und die eigene Zeile mit ihrem Platz. */
export function Leaderboard({ rows, limit }: { rows: readonly LeaderboardRow[]; limit?: number }) {
  const shown = topWithMe(rows, limit ?? rows.length);

  return (
    <ol>
      {shown.map(({ row, rank }, index) => (
        <li
          key={row.userId}
          value={rank}
          className={cn(
            "flex min-h-14 items-center gap-3 border-b",
            // Lücke vor der eigenen Zeile, wenn sie weiter hinten steht
            index > 0 && rank !== shown[index - 1].rank + 1 && "mt-4 border-t",
          )}
        >
          <span className="text-muted-foreground num w-6 text-sm">{rank}</span>
          <span className={cn("min-w-0 flex-1 truncate", row.isMe && "text-brand")}>
            {row.isMe ? (
              "Du"
            ) : (
              <Link href={`/person/${row.userId}`} className="hover:underline hover:underline-offset-4">
                {row.name}
              </Link>
            )}
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
