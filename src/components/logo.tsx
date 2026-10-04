import Image from "next/image";

// Logo-Dateien liegen in public/. Regeln zur Verwendung: docs/DESIGN.md, Abschnitt 7.
// full = Bildmarke mit Schriftzug (Anmeldung), mark = nur die Bildmarke (Seitenleiste).
export function Logo({ variant, priority = false }: { variant: "full" | "mark"; priority?: boolean }) {
  if (variant === "mark") {
    return <Image src="/logo-mark.png" alt="OHealth" width={45} height={44} priority={priority} />;
  }
  return <Image src="/logo.png" alt="OHealth" width={151} height={120} priority={priority} />;
}
