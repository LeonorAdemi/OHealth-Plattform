"use client";

import { ArrowUpDown, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Reihenfolge der Treffer als Auswahl; jede Option kennt ihre Adresse. */
export function SortSelect({
  value,
  options,
}: {
  value: string;
  options: readonly { value: string; label: string; href: string }[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <label className="text-foreground relative inline-flex min-h-11 items-center text-sm md:min-h-9">
      <span className="sr-only">Reihenfolge</span>
      <ArrowUpDown size={16} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute left-2" />
      <select
        value={value}
        onChange={(e) => {
          const href = options.find((o) => o.value === e.target.value)?.href;
          if (href) startTransition(() => router.replace(href, { scroll: false }));
        }}
        className="hover:bg-accent focus-visible:outline-ring min-h-11 cursor-pointer appearance-none rounded-lg bg-transparent pr-8 pl-8 text-sm transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 md:min-h-9"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute right-2" />
    </label>
  );
}
