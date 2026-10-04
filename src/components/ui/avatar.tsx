import Image from "next/image";

import { avatarSrc, initials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const SIZES = { sm: 32, md: 40, lg: 96 } as const;

/**
 * Profilbild, rund (docs/DESIGN.md, Abschnitt 9: vollrund nur Avatare). Ohne Bild stehen die
 * Initialen auf Nebel. Das Bild ist schon beim Hochladen verkleinert, deshalb ohne Bildoptimierung.
 */
export function Avatar({
  path,
  name,
  size = "md",
  className,
}: {
  path: string | null | undefined;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const px = SIZES[size];
  const src = avatarSrc(path);

  return (
    <span
      className={cn(
        "bg-muted text-muted-foreground relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium select-none",
        size === "lg" ? "text-titel" : "text-sm",
        className,
      )}
      style={{ width: px, height: px }}
    >
      {src ? (
        <Image src={src} alt="" width={px} height={px} unoptimized className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
