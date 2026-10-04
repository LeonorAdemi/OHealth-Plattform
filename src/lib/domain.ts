// Fachliche Wertebereiche. Die Datenbank sichert sie über Check-Constraints ab,
// die generierten Typen kennen sie aber nur als string. Hier werden sie eingegrenzt.

export const EXERCISE_MEASURES = ["weight_reps", "duration", "distance"] as const;
export type ExerciseMeasure = (typeof EXERCISE_MEASURES)[number];

/** Grenzt den Wert aus der Datenbank ein. Unbekanntes fällt auf den Standard zurück. */
export function toExerciseMeasure(value: string): ExerciseMeasure {
  return (EXERCISE_MEASURES as readonly string[]).includes(value)
    ? (value as ExerciseMeasure)
    : "weight_reps";
}
