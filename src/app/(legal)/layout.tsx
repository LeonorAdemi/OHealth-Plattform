import Link from "next/link";

import { Logo } from "@/components/logo";
import { legalReady } from "@/lib/legal";

// Rahmen für Impressum und Datenschutzerklärung: öffentlich, ohne Anmeldung lesbar.
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[640px] px-5 pt-8 pb-16">
      <Link href="/" aria-label="Zur Startseite" className="inline-block">
        <Logo variant="mark" />
      </Link>

      {!legalReady() && (
        <p
          role="note"
          className="border-destructive text-destructive mt-6 rounded-lg border p-3 text-sm"
        >
          Entwurf: Diese Seite ist noch nicht vollständig und nicht rechtlich
          geprüft. Angaben in eckigen Klammern fehlen noch.
        </p>
      )}

      <article className="legal mt-8">{children}</article>

      <nav
        aria-label="Rechtliches"
        className="text-muted-foreground mt-12 flex flex-wrap gap-x-4 gap-y-2 text-sm"
      >
        <Link href="/impressum" className="underline underline-offset-4">
          Impressum
        </Link>
        <Link href="/datenschutz" className="underline underline-offset-4">
          Datenschutz
        </Link>
        <Link
          href="/nutzungsbedingungen"
          className="underline underline-offset-4"
        >
          Nutzungsbedingungen
        </Link>
      </nav>
    </main>
  );
}
