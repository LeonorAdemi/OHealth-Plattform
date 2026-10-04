// Ziel nach der Anmeldung. Nur interne Pfade sind erlaubt, damit ein präparierter
// Link niemanden nach dem Login auf eine fremde Seite umleiten kann.
// Vorbild: Baustein "safe-next-path" der offiziellen Supabase-Vorlage.
export function safeNextPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
