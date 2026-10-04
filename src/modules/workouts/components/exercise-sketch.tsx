"use client";

import Image from "next/image";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";

import { exerciseImage } from "../exercise-images";

// Skizze der Ausführung einer Katalogübung. Sie wird erst auf Wunsch geladen,
// damit das Loggen kompakt bleibt. Übungen ohne Skizze zeigen nichts an.
export function ExerciseSketch({ name }: { name: string }) {
  const src = exerciseImage(name);
  const [open, setOpen] = useState(false);
  const id = useId();

  if (!src) return null;

  return (
    <div className="mt-1">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      >
        {open ? "Ausführung ausblenden" : "Ausführung zeigen"}
      </Button>
      {open && (
        <div id={id} className="mt-2 max-w-sm border-y py-2">
          <Image
            src={src}
            alt={`Skizze der Ausführung: ${name}`}
            width={240}
            height={160}
            className="h-auto w-full"
          />
        </div>
      )}
    </div>
  );
}
