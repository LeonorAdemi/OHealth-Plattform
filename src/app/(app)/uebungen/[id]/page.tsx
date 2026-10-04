import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  APP_TIME_ZONE,
  formatDistance,
  formatDuration,
  formatNumber,
  formatSessionSummary,
  formatWeight,
} from "@/modules/workouts/logic";
import { getExerciseHistory } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Verlauf der Übung" };

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function ExerciseHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const history = await getExerciseHistory(id);
  if (!history) notFound();

  // Die eine Hauptzahl: der Bestwert, passend zur Messart.
  let headline: { value: string; unit: string; label: string } | null = null;
  const best = history.best;
  if (best) {
    if (history.measure === "duration" && best.maxDurationSeconds !== null) {
      headline = { ...formatDuration(best.maxDurationSeconds), label: "längste Dauer" };
    } else if (history.measure === "distance" && best.totalDistanceM !== null) {
      headline = { ...formatDistance(best.totalDistanceM), label: "Strecke insgesamt" };
    } else if (best.maxWeightKg !== null && best.maxWeightKg > 0) {
      headline = { value: formatWeight(best.maxWeightKg), unit: "kg", label: "schwerster Satz" };
    } else if (best.maxReps !== null) {
      headline = { value: formatNumber(best.maxReps), unit: "Wdh.", label: "meiste Wiederholungen" };
    }
  }

  return (
    <>
      <h1 className="text-muted-foreground text-sm">{history.name}</h1>
      {headline ? (
        <>
          <p className="mt-2">
            <span className="num-display text-grosszahl">{headline.value}</span>{" "}
            <span className="text-muted-foreground text-sm">{headline.unit}</span>
          </p>
          <p className="mt-1">
            {headline.label}
            {best?.bestE1rmKg ? (
              <span className="text-muted-foreground">
                {" "}
                · geschätztes Maximum <span className="num">{formatWeight(best.bestE1rmKg)}</span>&nbsp;kg
              </span>
            ) : null}
          </p>
        </>
      ) : (
        <p className="mt-4 max-w-xl">Noch kein Training mit dieser Übung. Hier erscheint dein Verlauf.</p>
      )}

      {history.sessions.length > 0 && (
        <ol className="mt-8 max-w-2xl" aria-label="Verlauf">
          {history.sessions.map((session) => (
            <li key={session.workoutId} className="border-b">
              <Link
                href={`/workouts/${session.workoutId}`}
                className="hover:bg-accent -mx-2 block rounded-lg px-2 py-4 transition-colors duration-150 ease-out"
              >
                <span className="text-muted-foreground block text-sm">
                  {dateFormat.format(new Date(session.performedAt))}
                </span>
                <span className="num mt-1 block">{formatSessionSummary(session, history.measure)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
