"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { ChoiceChip } from "@/components/ui/choice-chip";

/**
 * Auswahl als Chips, die in der Adresse steht (?param=), damit Links und Zurück passen. Mit allLabel
 * gibt es vorn einen Chip ohne Auswahl, sonst hebt ein zweiter Tipp die Auswahl auf. clear nennt
 * Parameter, die bei jeder Änderung wegfallen (etwa der Ausgangsstand, wenn sich das Ziel ändert).
 */
export function ParamChips({
  label,
  param,
  options,
  value,
  allLabel,
  clear = [],
}: {
  label: string;
  param: string;
  options: readonly { id: string; label: string }[];
  value: string | null;
  allLabel?: string;
  clear?: readonly string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function select(id: string | null) {
    const next = new URLSearchParams(params);
    for (const name of clear) next.delete(name);
    if (id) next.set(param, id);
    else next.delete(param);
    const query = next.toString();
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      }),
    );
  }

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {allLabel && (
        <ChoiceChip selected={value === null} onClick={() => select(null)}>
          {allLabel}
        </ChoiceChip>
      )}
      {options.map((o) => (
        <ChoiceChip
          key={o.id}
          selected={value === o.id}
          onClick={() => select(value === o.id && !allLabel ? null : o.id)}
        >
          {o.label}
        </ChoiceChip>
      ))}
    </div>
  );
}
