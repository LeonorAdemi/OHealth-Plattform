import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TERMS_VERSION } from "@/lib/legal";
import { AcceptTermsForm } from "@/modules/core/components/terms-consent";
import { getAcceptedTermsVersion } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Nutzungsbedingungen" };

// Wer der aktuellen Fassung noch nicht zugestimmt hat, landet hier (AppLayout).
export default async function ConsentPage() {
  if ((await getAcceptedTermsVersion()) === TERMS_VERSION) redirect("/");

  return (
    <>
      <h1 className="text-titel font-semibold">Kurz bestätigen</h1>
      <p className="mt-4">
        Für OHealth gelten Nutzungsbedingungen: respektvoll miteinander umgehen, keine Werbung, keine falschen Angaben.
        Bitte bestätige sie und dein Alter, dann geht es weiter.
      </p>
      <div className="mt-8">
        <AcceptTermsForm />
      </div>
    </>
  );
}
