"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import type { FormState } from "@/lib/result";

import { saveOnboarding } from "../actions";
import { MAX_SPORTS, SPORT_CATEGORY_LABEL, type SportCategory } from "../logic";

const initial: FormState = {};

/** Einstieg: Sportarten (bis zu fünf) und Stadt. Städte, die noch nicht live sind, heißen „bald“. */
export function OnboardingForm({
  sports,
  cities,
  initialSports,
  initialCityId,
}: {
  sports: readonly { id: string; name: string; category: SportCategory }[];
  cities: readonly { id: string; name: string; live: boolean }[];
  initialSports: readonly string[];
  initialCityId: string;
}) {
  const [state, action, pending] = useActionState(saveOnboarding, initial);
  const [chosen, setChosen] = useState<string[]>([...initialSports]);
  const [cityId, setCityId] = useState(initialCityId);
  const full = chosen.length >= MAX_SPORTS;
  const groups = (Object.keys(SPORT_CATEGORY_LABEL) as SportCategory[])
    .map((category) => ({ category, items: sports.filter((s) => s.category === category) }))
    .filter((g) => g.items.length > 0);
  const city = cities.find((c) => c.id === cityId);

  function toggle(name: string) {
    setChosen((current) =>
      current.includes(name) ? current.filter((n) => n !== name) : full ? current : [...current, name],
    );
  }

  return (
    <form action={action} className="space-y-10">
      {chosen.map((name) => (
        <input key={name} type="hidden" name="sports" value={name} />
      ))}
      <input type="hidden" name="cityId" value={cityId} />

      <fieldset className="space-y-4">
        <legend className="text-xl font-semibold">Was machst du gern?</legend>
        <p className="text-muted-foreground text-sm">
          Bis zu {MAX_SPORTS} Sportarten. Danach siehst du passende Trainings und Communities.
        </p>
        {groups.map((g) => (
          <div key={g.category} role="group" aria-label={SPORT_CATEGORY_LABEL[g.category]} className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">{SPORT_CATEGORY_LABEL[g.category]}</p>
            <div className="flex flex-wrap gap-2">
              {g.items.map((s) => (
                <ChoiceChip key={s.id} selected={chosen.includes(s.name)} onClick={() => toggle(s.name)}>
                  {s.name}
                </ChoiceChip>
              ))}
            </div>
          </div>
        ))}
        {full && <p className="text-muted-foreground text-sm">Fünf gewählt. Tipp eine an, um sie zu ändern.</p>}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-xl font-semibold">Wo trainierst du?</legend>
        <div role="group" aria-label="Stadt" className="flex flex-wrap gap-2">
          {cities.map((c) => (
            <ChoiceChip key={c.id} selected={cityId === c.id} onClick={() => setCityId(c.id)}>
              {c.live ? c.name : `${c.name} (bald)`}
            </ChoiceChip>
          ))}
        </div>
        {city && !city.live && (
          <p className="text-sm">
            In {city.name} startet OHealth noch nicht. Wir setzen dich auf die Warteliste und zeigen dir bis dahin
            München.
          </p>
        )}
      </fieldset>

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full md:w-auto" disabled={pending}>
        Weiter
      </Button>
    </form>
  );
}
