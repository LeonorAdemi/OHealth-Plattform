import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Reiter als Links (?tab=…), damit jeder Reiter eine eigene Adresse hat und ohne
 * JavaScript funktioniert. Der aktive Reiter ist unterstrichen, nicht eingefärbt.
 */
export function TabLinks({
  label,
  tabs,
  active,
}: {
  label: string;
  tabs: readonly { href: string; label: string; key: string }[];
  active: string;
}) {
  return (
    <nav aria-label={label} className="border-b">
      <ul className="-mb-px flex gap-6">
        {tabs.map((tab) => {
          const current = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                scroll={false}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-12 items-center border-b-2 transition-colors duration-150 ease-out",
                  current ? "border-foreground font-medium" : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
