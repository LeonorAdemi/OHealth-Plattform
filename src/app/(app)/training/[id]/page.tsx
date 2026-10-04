import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getExercises } from "@/modules/core/queries";
import { TrainingRunner } from "@/modules/workouts/components/training-runner";
import { planTrainingEntries } from "@/modules/workouts/logic";
import { getLastSets, getTemplate } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Training" };

export default async function TrainingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [template, exercises] = await Promise.all([getTemplate(id), getExercises()]);
  // Gestartet wird aus eigenen Vorlagen. Öffentliche werden vorher kopiert.
  if (!template || !template.isMine) notFound();

  const lastSets = await getLastSets(template.exercises.map((e) => e.exerciseId));
  const plan = planTrainingEntries(
    template.exercises,
    new Map(Object.entries(lastSets).map(([exerciseId, last]) => [exerciseId, last.sets])),
  );

  return (
    <>
      <h1 className="sr-only">Training {template.name}</h1>
      <TrainingRunner
        template={{ id: template.id, versionId: template.latestVersionId, name: template.name }}
        plan={plan}
        exercises={exercises}
        lastSets={lastSets}
      />
    </>
  );
}
