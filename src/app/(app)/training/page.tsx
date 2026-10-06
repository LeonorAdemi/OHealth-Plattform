import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ResumeTraining } from "@/modules/workouts/components/resume-training";
import { getMyTemplates } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Training starten" };

const exerciseCount = (count: number) => `${count} ${count === 1 ? "Übung" : "Übungen"}`;

export default async function StartTrainingPage() {
  const templates = await getMyTemplates();

  return (
    <>
      <h1 className="text-titel font-semibold">Training starten</h1>
      <ResumeTraining className="mt-4" />

      {templates.length === 0 ? (
        <div className="mt-8 max-w-xl">
          <p>Noch keine Vorlagen. Lege eine an, dann startest du dein Training mit einem Tipp.</p>
          <Button asChild className="mt-6 w-full md:w-auto">
            <Link href="/vorlagen/neu">Vorlage erstellen</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mt-2 text-sm">Wähl eine Vorlage.</p>
          <ul className="mt-4 max-w-2xl" aria-label="Deine Vorlagen">
            {templates.map((template) => (
              <li key={template.id} className="border-b">
                <Link
                  href={`/vorlagen/${template.id}`}
                  className="hover:bg-accent -mx-2 block rounded-lg px-2 py-4 transition-colors duration-150 ease-out"
                >
                  <span className="block font-medium">{template.name}</span>
                  <span className="text-muted-foreground mt-1 block text-sm">
                    {exerciseCount(template.exerciseCount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-10 flex flex-wrap gap-x-6 text-sm">
        <Link href="/vorlagen" className="inline-flex min-h-11 items-center underline underline-offset-4">
          Alle Vorlagen, auch von anderen
        </Link>
        <Link href="/workouts/neu" className="inline-flex min-h-11 items-center underline underline-offset-4">
          Ohne Vorlage: Sätze nachtragen
        </Link>
      </p>
    </>
  );
}
