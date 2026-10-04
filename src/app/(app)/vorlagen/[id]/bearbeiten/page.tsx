import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getExercises } from "@/modules/core/queries";
import { TemplateForm } from "@/modules/workouts/components/template-form";
import { toTemplateDraftEntries } from "@/modules/workouts/logic";
import { getTemplate } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Vorlage bearbeiten" };

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [template, exercises] = await Promise.all([getTemplate(id), getExercises()]);
  if (!template || !template.isMine) notFound();

  return (
    <>
      <h1 className="text-titel font-semibold">Vorlage bearbeiten</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Deine Änderung wird als Version {template.latestNumber + 1} gespeichert. Die bisherigen
        Versionen bleiben erhalten.
      </p>
      <div className="mt-8">
        <TemplateForm
          exercises={exercises}
          existing={{
            id: template.id,
            name: template.name,
            visibility: template.visibility,
            entries: toTemplateDraftEntries(template.exercises),
          }}
        />
      </div>
    </>
  );
}
