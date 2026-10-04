"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert">
      <h1 className="text-titel font-semibold">Das hat nicht geklappt</h1>
      <p className="mt-4 max-w-xl">
        Die Seite konnte nicht geladen werden. Prüf deine Verbindung und versuch es erneut.
      </p>
      <Button className="mt-6" onClick={reset}>
        Erneut laden
      </Button>
    </div>
  );
}
