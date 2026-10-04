"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { muscleGroups, searchExercises, type SearchableExercise } from "../logic";
import { MuscleGroupIcon } from "./muscle-group-icon";

// Übung per Suche hinzufügen. Ohne Eingabe stehen die Muskelgruppen als Einstieg bereit,
// ein Tipp auf einen Treffer fügt die Übung direkt hinzu.
export function ExercisePicker({
  exercises,
  onPick,
}: {
  exercises: readonly SearchableExercise[];
  onPick: (exerciseId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const results = searchExercises(exercises, query, 8);
  const searching = query.trim() !== "";

  return (
    <div className="space-y-2">
      <Label htmlFor="exercise-search">Übung hinzufügen</Label>
      <Input
        id="exercise-search"
        inputMode="search"
        enterKeyHint="search"
        value={query}
        placeholder="Bankdrücken, Squat, Rücken"
        autoComplete="off"
        autoCorrect="off"
        onChange={(e) => setQuery(e.target.value)}
      />

      {!searching && (
        <ul className="flex flex-wrap gap-x-5 text-sm" aria-label="Nach Muskelgruppe suchen">
          {muscleGroups(exercises).map((group) => (
            <li key={group}>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex min-h-11 items-center gap-2 transition-colors duration-150 ease-out"
                onClick={() => setQuery(group)}
              >
                <MuscleGroupIcon group={group} />
                <span className="underline underline-offset-4">{group}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {searching && results.length === 0 && (
        <p className="text-muted-foreground text-sm">Keine Übung gefunden.</p>
      )}

      {results.length > 0 && (
        <ul aria-label="Treffer">
          {results.map((exercise) => (
            <li key={exercise.id} className="border-b">
              <button
                type="button"
                className="hover:bg-accent -mx-2 flex min-h-12 w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-lg px-2 text-left transition-colors duration-150 ease-out"
                onClick={() => {
                  onPick(exercise.id);
                  setQuery("");
                }}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <MuscleGroupIcon group={exercise.muscleGroup} className="text-muted-foreground shrink-0" />
                  <span className="truncate">{exercise.name}</span>
                </span>
                <span className="text-muted-foreground shrink-0 text-sm">{exercise.muscleGroup}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
