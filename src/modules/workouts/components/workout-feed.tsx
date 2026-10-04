import Link from "next/link";

import { cn } from "@/lib/utils";

import { formatWorkoutDuration, formatWorkoutWhen } from "../logic";

export type FeedWorkout = {
  id: string;
  /** Anzeigename, nur in der Gruppenansicht */
  name?: string;
  isMe: boolean;
  title: string | null;
  performedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  setCount: number;
};

/**
 * Liste der letzten Workouts. Eigene Workouts führen zur Detailansicht. Die Workouts anderer
 * Personen sind in der Liste sichtbar, ihre Detailansicht gehört aber nur ihnen selbst.
 */
export function WorkoutFeed({ workouts, now, label }: { workouts: readonly FeedWorkout[]; now: Date; label: string }) {
  return (
    <ol aria-label={label}>
      {workouts.map((workout) => {
        const detail = [
          formatWorkoutWhen(workout.performedAt, now),
          workout.startedAt && workout.finishedAt
            ? formatWorkoutDuration(workout.startedAt, workout.finishedAt)
            : null,
          `${workout.setCount} ${workout.setCount === 1 ? "Satz" : "Sätze"}`,
        ]
          .filter(Boolean)
          .join(" · ");

        const content = (
          <>
            <span className={cn("block font-medium", workout.isMe && workout.name !== undefined && "text-brand")}>
              {workout.name !== undefined && <>{workout.isMe ? "Du" : workout.name} · </>}
              {workout.title ?? "Workout"}
            </span>
            <span className="text-muted-foreground mt-1 block text-sm">{detail}</span>
          </>
        );

        return (
          <li key={workout.id} className="border-b">
            {workout.isMe ? (
              <Link
                href={`/workouts/${workout.id}`}
                className="hover:bg-accent -mx-2 block min-h-14 rounded-lg px-2 py-3 transition-colors duration-150 ease-out"
              >
                {content}
              </Link>
            ) : (
              <div className="min-h-14 py-3">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
