import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getMyTemplates, getPublicTemplates } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Vorlagen" };

const exerciseCount = (count: number) => `${count} ${count === 1 ? "Übung" : "Übungen"}`;

export default async function TemplatesPage() {
  const [mine, shared] = await Promise.all([getMyTemplates(), getPublicTemplates()]);

  return (
    <>
      <h1 className="text-muted-foreground text-sm">Vorlagen</h1>
      <p className="num-display text-grosszahl mt-2">{mine.length}</p>
      <p className="mt-1">{mine.length === 1 ? "eigene Vorlage" : "eigene Vorlagen"}</p>

      {mine.length === 0 ? (
        <p className="mt-8 max-w-xl">
          Noch keine Vorlagen. Lege eine an, zum Beispiel Oberkörper oder Unterkörper, und wähl sie
          vor dem Training aus.
        </p>
      ) : (
        <ul className="mt-6 max-w-2xl" aria-label="Eigene Vorlagen">
          {mine.map((template) => (
            <li key={template.id} className="border-b">
              <Link
                href={`/vorlagen/${template.id}`}
                className="hover:bg-accent -mx-2 block rounded-lg px-2 py-4 transition-colors duration-150 ease-out"
              >
                <span className="block font-medium">{template.name}</span>
                <span className="text-muted-foreground mt-1 block text-sm">
                  {exerciseCount(template.exerciseCount)} · Version {template.versionNumber} ·{" "}
                  {template.visibility === "public" ? "öffentlich" : "privat"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Button asChild className="mt-8 w-full md:w-auto">
        <Link href="/vorlagen/neu">Vorlage erstellen</Link>
      </Button>

      {shared.length > 0 && (
        <section className="mt-12 max-w-2xl" aria-labelledby="shared-heading">
          <h2 id="shared-heading" className="text-xl font-semibold">
            Öffentliche Vorlagen
          </h2>
          <ul className="mt-2">
            {shared.map((template) => (
              <li key={template.id} className="border-b">
                <Link
                  href={`/vorlagen/${template.id}`}
                  className="hover:bg-accent -mx-2 block rounded-lg px-2 py-4 transition-colors duration-150 ease-out"
                >
                  <span className="block font-medium">{template.name}</span>
                  <span className="text-muted-foreground mt-1 block text-sm">
                    von {template.authorName} · {exerciseCount(template.exerciseCount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
