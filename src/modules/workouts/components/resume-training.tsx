"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatClock, parseTrainingSession, TRAINING_KEY, type TrainingSession } from "../logic";

/** Hinweis auf ein Training, das auf diesem Gerät noch läuft. Ohne laufendes Training: nichts. */
export function ResumeTraining({ className }: { className?: string }) {
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Laden aus localStorage nach dem Hydrieren
      setSession(parseTrainingSession(window.localStorage.getItem(TRAINING_KEY)));
    } catch {
      // Ohne lokalen Speicher gibt es kein laufendes Training.
    }
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!session) return null;

  return (
    <p className={className}>
      Training „{session.title}“ läuft seit{" "}
      <span className="num">{formatClock((now - session.startedAt) / 1000)}</span>.{" "}
      <Link
        href={session.templateId ? `/training/${session.templateId}` : "/training"}
        className="underline underline-offset-4"
      >
        Fortsetzen
      </Link>
    </p>
  );
}
