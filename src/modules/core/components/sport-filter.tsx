"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { ChoiceChip } from "@/components/ui/choice-chip";

/** Filter nach Sportart als Chips, steht in der Adresse (?sport=), damit Links und Zurück passen. */
export function SportFilter({ options, value }: { options: readonly { id: string; name: string }[]; value: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function select(sport: string | null) {
    const next = new URLSearchParams(params);
    if (sport) next.set("sport", sport);
    else next.delete("sport");
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  return (
    <div role="group" aria-label="Nach Sportart filtern" className="flex flex-wrap gap-2">
      <ChoiceChip selected={value === null} onClick={() => select(null)}>
        Alle
      </ChoiceChip>
      {options.map((o) => (
        <ChoiceChip key={o.id} selected={value === o.id} onClick={() => select(o.id)}>
          {o.name}
        </ChoiceChip>
      ))}
    </div>
  );
}
