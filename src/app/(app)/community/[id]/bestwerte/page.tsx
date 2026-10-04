import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { getMyCommunity } from "@/modules/core/queries";
import { BestRanking } from "@/modules/workouts/components/best-ranking";
import { getCommunityBests, getGroupBests } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Bestwerte" };

export default async function CommunityBestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ u?: string }>;
}) {
  const [{ id }, { u }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const community = await getMyCommunity(id);
  if (!community) notFound();
  const bests = community.kind === "public" ? await getCommunityBests(id, u) : await getGroupBests(id, u);

  return (
    <>
      <p className="text-sm">
        <Link
          href={`/community/${id}?tab=rangliste`}
          className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4"
        >
          {community.name}
        </Link>
      </p>
      <h1 className="text-titel mt-2 font-semibold">Bestwerte</h1>

      <section className="mt-6 max-w-2xl" aria-label="Bestwerte je Übung">
        {bests.selected ? (
          <>
            <ul className="flex flex-wrap gap-x-4 text-sm" aria-label="Übungen">
              {bests.exercises.map((exercise) => (
                <li key={exercise.id}>
                  <Link
                    href={`/community/${id}/bestwerte?u=${exercise.id}`}
                    aria-current={exercise.id === bests.selected?.id ? "true" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center underline-offset-4",
                      exercise.id === bests.selected?.id ? "font-medium" : "text-muted-foreground underline",
                    )}
                  >
                    {exercise.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-1 text-sm">
              {bests.selected.measure === "weight_reps"
                ? "Geschätztes Maximum für eine Wiederholung, berechnet aus dem besten Satz."
                : bests.selected.measure === "duration"
                  ? "Längste gehaltene Zeit."
                  : "Gesamte Strecke aller Workouts."}
            </p>
            <div className="mt-2">
              <BestRanking rows={bests.ranking} />
            </div>
          </>
        ) : (
          <p>Noch keine Bestwerte. Sie erscheinen, sobald jemand hier ein Workout speichert.</p>
        )}
      </section>
    </>
  );
}
