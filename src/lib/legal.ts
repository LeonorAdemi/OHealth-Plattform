// Angaben zum Betreiber für Impressum und Datenschutzerklärung.
// Solange hier etwas fehlt, zeigen beide Seiten einen deutlichen Entwurfs-Hinweis.
// Was vor dem ersten echten Nutzer zu tun ist, steht in docs/LEGAL.md.

export type Operator = {
  /** Vor- und Nachname oder Firma mit Rechtsform */
  name: string;
  /** Straße und Hausnummer (ladungsfähige Anschrift, kein Postfach) */
  street: string;
  /** Postleitzahl und Ort */
  city: string;
  country: string;
  email: string;
  /** Optional: Telefonnummer */
  phone: string;
  /** Zuständige Datenschutz-Aufsichtsbehörde, z. B. "Bayerisches Landesamt für Datenschutzaufsicht" */
  supervisoryAuthority: string;
  /** Datum der letzten inhaltlichen Änderung der Rechtstexte, JJJJ-MM-TT */
  lastUpdated: string;
  /** Erst auf true setzen, wenn die Texte rechtlich geprüft sind */
  reviewed: boolean;
};

export const operator: Operator = {
  name: "",
  street: "",
  city: "",
  country: "Deutschland",
  email: "",
  phone: "",
  supervisoryAuthority: "",
  lastUpdated: "2026-10-05",
  reviewed: false,
};

/** Pflichtangaben vorhanden und Texte geprüft? */
export function legalReady(op: Operator = operator): boolean {
  return (
    [op.name, op.street, op.city, op.country, op.email].every(
      (v) => v.trim() !== "",
    ) && op.reviewed
  );
}

/** Zeigt die Angabe oder einen sichtbaren Platzhalter, solange sie fehlt. */
export function orPlaceholder(value: string, label: string): string {
  return value.trim() !== "" ? value : `[${label} fehlt]`;
}

/**
 * Fassung der Nutzungsbedingungen (Datum der letzten inhaltlichen Änderung). Wer einer älteren
 * Fassung zugestimmt hat, bestätigt die neue beim nächsten Öffnen der App (terms_acceptances).
 */
export const TERMS_VERSION = "2026-10-06";

/** Mindestalter für ein Konto (Einwilligung nach Art. 8 DSGVO in Deutschland ab 16) */
export const MIN_AGE = 16;
