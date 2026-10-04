// Basis: Origin UI (MIT). Angepasst an docs/DESIGN.md.
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input placeholder:text-muted-foreground flex h-12 w-full min-w-0 rounded-lg border bg-transparent px-3 text-base transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 md:h-10",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
