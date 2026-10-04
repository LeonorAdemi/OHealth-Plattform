"use client";

import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExerciseMeasure } from "@/lib/domain";
import { cn } from "@/lib/utils";

import { saveTemplate } from "../actions";
import {
  buildTemplatePayload,
  DEFAULT_TARGET_SETS,
  type SearchableExercise,
  type TemplateDraftEntry,
  type TemplateVisibility,
} from "../logic";
import { ExercisePicker } from "./exercise-picker";
import { ExerciseSketch } from "./exercise-sketch";

type Exercise = SearchableExercise & { measure: ExerciseMeasure };

export type ExistingTemplate = {
  id: string;
  name: string;
  visibility: TemplateVisibility;
  entries: TemplateDraftEntry[];
};

const VALUE_LABEL: Record<ExerciseMeasure, string> = {
  weight_reps: "Wiederholungen",
  duration: "Sekunden",
  distance: "Meter",
};

const VISIBILITY_OPTIONS: { value: TemplateVisibility; label: string; hint: string }[] = [
  { value: "private", label: "Privat", hint: "Nur du siehst die Vorlage." },
  {
    value: "public",
    label: "Öffentlich",
    hint: "Alle Angemeldeten sehen die Vorlage mit deinem Namen und können sie kopieren.",
  },
];

/**
 * Formular für eine neue Vorlage oder, mit existing, für eine Änderung.
 * Jede Änderung wird als neue Version gespeichert, die alten bleiben erhalten.
 */
export function TemplateForm({
  exercises,
  existing,
}: {
  exercises: readonly Exercise[];
  existing?: ExistingTemplate;
}) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [visibility, setVisibility] = useState<TemplateVisibility>(existing?.visibility ?? "private");
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<TemplateDraftEntry[]>(existing?.entries ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Dieselbe Version-ID bei jedem Versuch: Wiederholungen legen keine zweite Version an.
  const [versionId] = useState(() => crypto.randomUUID());
  const [templateId] = useState(() => existing?.id ?? crypto.randomUUID());

  const byId = new Map(exercises.map((e) => [e.id, e]));

  function change(next: TemplateDraftEntry[]) {
    setEntries(next);
    setError(null);
  }

  function patchEntry(index: number, patch: Partial<TemplateDraftEntry>) {
    change(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= entries.length) return;
    const next = [...entries];
    [next[index], next[target]] = [next[target], next[index]];
    change(next);
  }

  function addExercise(exerciseId: string) {
    const measure = byId.get(exerciseId)?.measure ?? "weight_reps";
    change([
      ...entries,
      { exerciseId, measure, sets: String(DEFAULT_TARGET_SETS), value: "", weight: "" },
    ]);
  }

  async function submit() {
    if (saving) return;

    if (name.trim() === "") {
      setError("Gib der Vorlage einen Namen.");
      return;
    }
    const payload = buildTemplatePayload(entries);
    if (!payload.ok) {
      setError(payload.error);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await saveTemplate({
        templateId,
        versionId,
        name,
        visibility,
        note: existing ? note : undefined,
        exercises: payload.exercises,
      });
      if (result.ok) {
        router.push(`/vorlagen/${result.data.id}`);
        router.refresh();
        return;
      }
      setError(result.error);
    } catch {
      setError("Speichern fehlgeschlagen. Prüf deine Verbindung und versuch es erneut.");
    }
    setSaving(false);
  }

  return (
    <div className="max-w-xl space-y-8">
      <div className="space-y-2">
        <Label htmlFor="template-name">Name der Vorlage</Label>
        <Input
          id="template-name"
          value={name}
          maxLength={60}
          placeholder="Oberkörper"
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
      </div>

      {entries.map((entry, index) => {
        const exercise = byId.get(entry.exerciseId);
        const withWeight = entry.measure === "weight_reps";

        return (
          <section key={index} aria-label={exercise?.name ?? "Übung"}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="min-w-0 truncate text-xl font-semibold">{exercise?.name ?? "Übung"}</h2>
              <div className="flex shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${exercise?.name ?? "Übung"} nach oben`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp strokeWidth={1.5} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${exercise?.name ?? "Übung"} nach unten`}
                  disabled={index === entries.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown strokeWidth={1.5} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${exercise?.name ?? "Übung"} entfernen`}
                  onClick={() => change(entries.filter((_, i) => i !== index))}
                >
                  <X strokeWidth={1.5} />
                </Button>
              </div>
            </div>

            {exercise && <ExerciseSketch name={exercise.name} />}

            <div className="mt-3 flex gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor={`sets-${index}`}>Sätze</Label>
                <Input
                  id={`sets-${index}`}
                  inputMode="numeric"
                  className="num-display text-right text-xl"
                  value={entry.sets}
                  onChange={(e) => patchEntry(index, { sets: e.target.value })}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor={`value-${index}`}>{VALUE_LABEL[entry.measure]}</Label>
                <Input
                  id={`value-${index}`}
                  inputMode={entry.measure === "distance" ? "decimal" : "numeric"}
                  className="num-display text-right text-xl"
                  value={entry.value}
                  onChange={(e) => patchEntry(index, { value: e.target.value })}
                />
              </div>
              {withWeight && (
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`weight-${index}`}>Gewicht in kg</Label>
                  <Input
                    id={`weight-${index}`}
                    inputMode="decimal"
                    className="num-display text-right text-xl"
                    value={entry.weight}
                    onChange={(e) => patchEntry(index, { weight: e.target.value })}
                  />
                </div>
              )}
            </div>
          </section>
        );
      })}

      <ExercisePicker exercises={exercises} onPick={addExercise} />

      {entries.length === 0 && (
        <p className="text-muted-foreground text-sm">
          <Plus size={16} strokeWidth={1.5} aria-hidden className="mr-1 inline align-text-bottom" />
          Such oben nach einer Übung und tipp sie an, um sie der Vorlage hinzuzufügen.
        </p>
      )}

      <fieldset className="space-y-1">
        <legend className="mb-1 text-sm font-medium">Sichtbarkeit</legend>
        {VISIBILITY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn("flex min-h-11 cursor-pointer items-start gap-3 py-2")}
          >
            <input
              type="radio"
              name="visibility"
              value={option.value}
              checked={visibility === option.value}
              className="accent-primary mt-1 size-5 shrink-0"
              onChange={() => setVisibility(option.value)}
            />
            <span>
              <span className="block">{option.label}</span>
              <span className="text-muted-foreground block text-sm">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {existing && (
        <div className="space-y-2">
          <Label htmlFor="template-note">Was hast du geändert? (optional)</Label>
          <Input
            id="template-note"
            value={note}
            maxLength={200}
            placeholder="Rudern statt Klimmzug"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-3">
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button className="w-full md:w-auto" disabled={saving} onClick={submit}>
          {saving ? "Wird gesendet" : existing ? "Als neue Version speichern" : "Vorlage speichern"}
        </Button>
      </div>
    </div>
  );
}
