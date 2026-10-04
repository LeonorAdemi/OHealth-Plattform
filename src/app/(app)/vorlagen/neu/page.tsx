import type { Metadata } from "next";

import { getExercises } from "@/modules/core/queries";
import { TemplateForm } from "@/modules/workouts/components/template-form";

export const metadata: Metadata = { title: "Neue Vorlage" };

export default async function NewTemplatePage() {
  const exercises = await getExercises();

  return (
    <>
      <h1 className="text-titel font-semibold">Neue Vorlage</h1>
      <div className="mt-8">
        <TemplateForm exercises={exercises} />
      </div>
    </>
  );
}
