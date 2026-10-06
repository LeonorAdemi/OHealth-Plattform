"use client";

import { CalendarDays, Compass, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Heute", icon: CalendarDays },
  { href: "/entdecken", label: "Entdecken", icon: Compass },
  { href: "/gruppen", label: "Gruppen", icon: Users },
  { href: "/chats", label: "Chats", icon: MessageCircle },
] as const;

// Welche Bereiche zu einem Tab gehören. Vorlagen und Training gehören zum Kraft-Modus unter „Heute“.
const SECTIONS: Record<(typeof ITEMS)[number]["href"], readonly string[]> = {
  "/": ["/aktivitaet", "/workouts", "/training", "/uebungen", "/plan", "/vorlagen", "/verlauf"],
  "/entdecken": ["/entdecken"],
  "/gruppen": ["/gruppen", "/community", "/menschen"],
  "/chats": ["/chats"],
};

function isActive(pathname: string, href: (typeof ITEMS)[number]["href"]) {
  return (href === "/" && pathname === "/") || SECTIONS[href].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Handy: Tab-Leiste unten. Desktop: Einträge der Seitenleiste.
// Verlauf und Einstellungen erreicht man über das Profilbild oben rechts.
export function AppNav({
  variant,
  badges = {},
}: {
  variant: "tabs" | "side";
  /** Zusatz je Eintrag, etwa die Zahl ungelesener Chats */
  badges?: Partial<Record<(typeof ITEMS)[number]["href"], React.ReactNode>>;
}) {
  const pathname = usePathname();

  if (variant === "tabs") {
    return (
      <ul className="flex">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span className="relative inline-flex">
                  <Icon size={20} strokeWidth={1.5} aria-hidden />
                  {badges[href] && <span className="absolute -top-2 left-3 flex">{badges[href]}</span>}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="space-y-1">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "hover:bg-accent flex h-10 items-center gap-3 rounded-lg px-3 transition-colors duration-150 ease-out",
                active ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden />
              {label}
              {badges[href] && <span className="ml-auto flex">{badges[href]}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
