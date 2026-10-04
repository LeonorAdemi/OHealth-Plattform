import type { Metadata } from "next";
import Link from "next/link";

import { RequestResetForm } from "@/modules/core/components/simple-forms";

export const metadata: Metadata = { title: "Passwort vergessen" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-titel font-semibold">Passwort vergessen</h1>
      <p className="mt-4">
        Gib deine E-Mail-Adresse ein. Du bekommst einen Link, über den du ein neues Passwort
        festlegst.
      </p>
      <div className="mt-8">
        <RequestResetForm />
      </div>
      <p className="mt-6 text-sm">
        <Link href="/login" className="underline underline-offset-4">
          Zurück zur Anmeldung
        </Link>
      </p>
    </>
  );
}
