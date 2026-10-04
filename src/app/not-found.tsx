import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-sm px-5 pt-16">
      <h1 className="text-titel font-semibold">Seite nicht gefunden</h1>
      <p className="mt-4">Diese Seite gibt es nicht oder nicht mehr.</p>
      <p className="mt-6">
        <Link href="/" className="underline underline-offset-4">
          Zur Startseite
        </Link>
      </p>
    </main>
  );
}
