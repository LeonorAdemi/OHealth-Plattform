/**
 * Öffentliche Adresse eines Profilbilds. In der Datenbank steht nur der Pfad im Bucket
 * „avatars“ (<user_id>/<uuid>.webp), nie eine fremde Adresse (Migration profile_details).
 */
export function avatarSrc(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/avatars/${path}`;
}

/** Bis zu zwei Initialen für Personen ohne Profilbild: "Anna Berg" → "AB". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((p) => Array.from(p)[0]?.toUpperCase() ?? "").join("") || "?";
}
