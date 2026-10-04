"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Eigenes Profilbild oben rechts. Führt zum Profil mit Verlauf und Einstellungen. */
export function ProfileLink({ path, name }: { path: string | null; name: string }) {
  const pathname = usePathname();
  const active = pathname.startsWith("/profil") || pathname.startsWith("/verlauf");

  return (
    <Link
      href="/profil"
      aria-label={`Profil von ${name}`}
      aria-current={active ? "page" : undefined}
      className="hover:bg-accent inline-flex size-11 items-center justify-center rounded-full transition-colors duration-150 ease-out"
    >
      <Avatar
        path={path}
        name={name}
        size="sm"
        className={cn(active && "outline-foreground outline-2 outline-offset-2")}
      />
    </Link>
  );
}
