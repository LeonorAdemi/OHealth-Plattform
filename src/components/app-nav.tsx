"use client";

import { CalendarDays, History, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Heute", icon: CalendarDays },
  { href: "/gruppe", label: "Gruppe", icon: Users },
  { href: "/verlauf", label: "Verlauf", icon: History },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/workouts") : pathname.startsWith(href);
}

// Handy: Tab-Leiste unten. Desktop: Einträge der Seitenleiste.
export function AppNav({ variant }: { variant: "tabs" | "side" }) {
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
                <Icon size={20} strokeWidth={1.5} aria-hidden />
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
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
