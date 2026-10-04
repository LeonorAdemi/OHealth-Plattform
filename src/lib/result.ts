// Einheitliches Ergebnis aller Server Actions (docs/ENGINEERING.md, Abschnitt 6).
export type Result<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type FormState = { error?: string; message?: string };
