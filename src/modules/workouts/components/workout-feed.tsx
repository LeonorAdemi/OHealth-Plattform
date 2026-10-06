import Link from "next/link";

import { cn } from "@/lib/utils";
import type { SportCategory } from "@/modules/core/logic";
import { SportDot } from "@/modules/core/components/sport-dot";

import { activityMinutes, describeActivity, formatWorkoutWhen } from "../logic";

export type FeedWorkout = {
  id: string;
  /** Anzeigename, nur in der Gruppenansicht */
  name?: string;
  isMe: boolean;
  title: string | null;
  sportName: string;
  /** Gruppe der Sportart für den Farbpunkt */
  sportCategory?: SportCategory | null;
  performedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMinutes: number | null;
  distanceM: number | null;
  setCount: number;
};

/**
 * Liste der letzten Aktivitäten. Eigene führen zur Detailansicht. Die Aktivitäten anderer
 * Personen sind in der Liste sichtbar, ihre Detailansicht gehört aber nur ihnen selbst.
 */
export function WorkoutFeed({ workouts, now, label }: { workouts: readonly FeedWorkout[]; now: Date; label: string }) {
  return (
    <ol aria-label={label}>
      {workouts.map((workout) => {
        const detail = [
          formatWorkoutWhen(workout.performedAt, now),
          describeActivity({
            // Ohne eigenen Titel steht die Sportart schon in der Überschrift
            sportName: workout.title ? workout.sportName : "",
            durationMinutes: activityMinutes(workout),
            distanceM: workout.distanceM,
            setCount: workout.setCount,
          }),
        ]
          .filter(Boolean)
          .join(" · ");

        const content = (
          <>
            <span className={cn("flex items-center gap-2 font-medium", workout.isMe && workout.name !== undefined && "text-brand")}>
              <SportDot category={workout.sportCategory} />
              {workout.name !== undefined && <>{workout.isMe ? "Du" : workout.name} · </>}
              <span className="min-w-0">{workout.title ?? workout.sportName}</span>
            </span>
            <span className="text-muted-foreground mt-1 block text-sm">{detail}</span>
          </>
        );

        return (
          <li key={workout.id} className="border-b">
            {workout.isMe ? (
              <Link
                href={`/aktivitaet/${workout.id}`}
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
