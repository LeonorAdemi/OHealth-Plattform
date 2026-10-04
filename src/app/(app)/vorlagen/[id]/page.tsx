import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CopyTemplate,
  DeleteTemplate,
  RestoreVersion,
  TemplateVisibilityForm,
} from "@/modules/workouts/components/template-actions";
import {
  APP_TIME_ZONE,
  formatLastSets,
  formatTemplateTarget,
  versionSourceLabel,
} from "@/modules/workouts/logic";
import { getLastSets, getTemplate } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Vorlage" };

const dayFormat = new Intl.DateTimeFormat("de-DE", { timeZone: APP_TIME_ZONE, day: "numeric", month: "short" });

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function TemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const [{ id }, { v }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const versionNumber = v === undefined ? undefined : Number(v);
  if (versionNumber !== undefined && !Number.isInteger(versionNumber)) notFound();

  const template = await getTemplate(id, versionNumber);
  if (!template) notFound();
  const lastSets = await getLastSets(template.exercises.map((e) => e.exerciseId));

  const isLatest = template.selectedNumber === template.latestNumber;

  return (
    <>
      <p className="text-muted-foreground text-sm">
        {template.isMine
          ? template.visibility === "public"
            ? "Deine Vorlage · öffentlich"
            : "Deine Vorlage · privat"
          : `von ${template.authorName}`}
      </p>
      <h1 className="text-titel mt-1 font-semibold">{template.name}</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {isLatest
          ? `Version ${template.selectedNumber}, aktuell`
          : `Version ${template.selectedNumber} von ${template.latestNumber}, nicht die aktuelle`}
      </p>

      <ol className="mt-8 max-w-2xl" aria-label="Übungen">
        {template.exercises.map((exercise, index) => {
          const last = lastSets[exercise.exerciseId];
          return (
            <li key={index} className="min-h-14 border-b py-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="min-w-0">
                  <span className="text-muted-foreground mr-3 text-sm">{index + 1}</span>
                  {exercise.exerciseName}
                </span>
                <span className="num shrink-0">{formatTemplateTarget(exercise)}</span>
              </div>
              <p className="text-muted-foreground mt-1 pl-6 text-sm">
                {last ? (
                  <>
                    Zuletzt {dayFormat.format(new Date(last.performedAt))}:{" "}
                    <span className="num">{formatLastSets(last.sets)}</span>
                  </>
                ) : (
                  "Noch kein früheres Training"
                )}
                {" · "}
                <Link href={`/uebungen/${exercise.exerciseId}`} className="underline underline-offset-4">
                  Verlauf
                </Link>
              </p>
            </li>
          );
        })}
      </ol>

      <div className="mt-10 space-y-6">
        {!template.isMine && <CopyTemplate sourceId={template.id} />}
        {template.isMine && isLatest && (
          <div className="flex flex-col gap-3 md:flex-row">
            <Button asChild className="w-full md:w-auto">
              <Link href={`/training/${template.id}`}>Training starten</Link>
            </Button>
            <Button asChild variant="outline" className="w-full md:w-auto">
              <Link href={`/vorlagen/${template.id}/bearbeiten`}>Vorlage bearbeiten</Link>
            </Button>
          </div>
        )}
        {template.isMine && !isLatest && (
          <RestoreVersion id={template.id} version={template.selectedNumber} />
        )}
      </div>

      {template.versions.length > 1 && (
        <section className="mt-12 max-w-2xl" aria-labelledby="versions-heading">
          <h2 id="versions-heading" className="text-xl font-semibold">
            Versionen
          </h2>
          <ol className="mt-2">
            {template.versions.map((version) => {
              const current = version.number === template.selectedNumber;
              return (
                <li key={version.number} className="border-b">
                  <Link
                    href={
                      version.number === template.latestNumber
                        ? `/vorlagen/${template.id}`
                        : `/vorlagen/${template.id}?v=${version.number}`
                    }
                    aria-current={current ? "true" : undefined}
                    className={cn(
                      "hover:bg-accent -mx-2 block rounded-lg px-2 py-3 transition-colors duration-150 ease-out",
                      current && "font-medium",
                    )}
                  >
                    <span className="block">
                      Version {version.number}
                      {version.number === template.latestNumber && " (aktuell)"}
                    </span>
                    <span className="text-muted-foreground block text-sm">
                      {dateFormat.format(new Date(version.createdAt))} · {versionSourceLabel(version.source)}
                      {version.note && ` · ${version.note}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {template.isMine && (
        <section className="mt-12 max-w-2xl space-y-6" aria-label="Verwalten">
          <TemplateVisibilityForm id={template.id} visibility={template.visibility} />
          <DeleteTemplate id={template.id} />
        </section>
      )}
    </>
  );
}
