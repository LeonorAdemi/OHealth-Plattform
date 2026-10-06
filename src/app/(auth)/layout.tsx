import Link from "next/link";

import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-sm px-5 pt-12 pb-10">
      <Logo variant="full" priority />
      <div className="mt-10">{children}</div>
      <nav aria-label="Rechtliches" className="text-muted-foreground mt-12 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href="/impressum" className="underline underline-offset-4">
          Impressum
        </Link>
        <Link href="/datenschutz" className="underline underline-offset-4">
          Datenschutz
        </Link>
        <Link href="/nutzungsbedingungen" className="underline underline-offset-4">
          Nutzungsbedingungen
        </Link>
      </nav>
    </main>
  );
}
