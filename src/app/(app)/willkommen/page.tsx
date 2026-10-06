import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/modules/core/components/onboarding-form";
import { DEFAULT_CITY_ID } from "@/modules/core/logic";
import { getCities, getMyCityChoice, getSports, needsOnboarding } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Willkommen" };

// Einstieg für alle, die sich ohne Einladung registrieren: Sportarten und Stadt, dann „Entdecken“.
// Wer das schon hat (etwa ein bestehendes Konto über „Konto erstellen“ mit Google), kommt zu „Heute“.
export default async function WelcomePage() {
  if (!(await needsOnboarding())) redirect("/");
  const [sports, cities, choice] = await Promise.all([getSports(), getCities(), getMyCityChoice()]);
  return (
    <div className="max-w-2xl">
      <h1 className="text-titel font-semibold">Willkommen bei OHealth</h1>
      <p className="mt-2">Zwei Fragen, dann zeigen wir dir, wer in deiner Nähe trainiert.</p>
      <div className="mt-8">
        <OnboardingForm
          sports={sports}
          cities={cities}
          initialSports={choice.sports}
          initialCityId={choice.waitingFor ?? choice.cityId ?? DEFAULT_CITY_ID}
        />
      </div>
    </div>
  );
}
