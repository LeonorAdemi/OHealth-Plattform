"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/result";

import { copyTemplate, deleteTemplate, restoreTemplateVersion, setTemplateVisibility } from "../actions";
import type { TemplateVisibility } from "../logic";

const initial: FormState = {};

/** Kopiert eine fremde oder eigene Vorlage und öffnet die Kopie. */
export function CopyTemplate({ sourceId }: { sourceId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Dieselbe ID bei jedem Versuch: Wiederholungen legen keine zweite Kopie an.
  const [newId] = useState(() => crypto.randomUUID());

  async function copy() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await copyTemplate({ sourceId, newId });
      if (result.ok) {
        router.push(`/vorlagen/${result.data.id}`);
        router.refresh();
        return;
      }
      setError(result.error);
    } catch {
      setError("Kopieren fehlgeschlagen. Prüf deine Verbindung und versuch es erneut.");
    }
    setPending(false);
  }

  return (
    <div className="space-y-3">
      <Button className="w-full md:w-auto" disabled={pending} onClick={copy}>
        {pending ? "Wird kopiert" : "In meine Vorlagen kopieren"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

/** Macht eine alte Version zur neuesten. Der Verlauf bleibt vollständig erhalten. */
export function RestoreVersion({ id, version }: { id: string; version: number }) {
  const [state, action, pending] = useActionState(restoreTemplateVersion, initial);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <Button type="submit" className="w-full md:w-auto" disabled={pending}>
        {pending ? "Wird gesendet" : `Version ${version} wiederherstellen`}
      </Button>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Schaltet eine eigene Vorlage zwischen privat und öffentlich um. */
export function TemplateVisibilityForm({ id, visibility }: { id: string; visibility: TemplateVisibility }) {
  const [state, action, pending] = useActionState(setTemplateVisibility, initial);
  const isPublic = visibility === "public";

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="visibility" value={isPublic ? "private" : "public"} />
      <p>
        {isPublic
          ? "Öffentlich: Alle Angemeldeten sehen diese Vorlage mit deinem Namen und können sie kopieren."
          : "Privat: Nur du siehst diese Vorlage."}
      </p>
      <Button type="submit" variant="outline" disabled={pending}>
        {isPublic ? "Privat stellen" : "Öffentlich stellen"}
      </Button>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state.message && <p role="status" className="text-muted-foreground text-sm">{state.message}</p>}
    </form>
  );
}

// Löschen in zwei Schritten: erst nachfragen, dann endgültig löschen.
export function DeleteTemplate({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(deleteTemplate, initial);

  if (!confirming) {
    return (
      <Button variant="ghost" className="-ml-4" onClick={() => setConfirming(true)}>
        Vorlage löschen
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <p>
        Die Vorlage und alle ihre Versionen werden gelöscht. Bereits gespeicherte Aktivitäten und
        Kopien anderer Personen bleiben bestehen. Das lässt sich nicht rückgängig machen.
      </p>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" variant="destructive" disabled={pending}>
          Endgültig löschen
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
