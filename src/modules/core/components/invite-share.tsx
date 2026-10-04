"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

// Teilt den Einladungslink über das Teilen-Menü des Geräts, sonst über die Zwischenablage.
export function InviteShare({ url, groupName }: { url: string; groupName: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function share() {
    setStatus(null);
    const text = `Komm in meine Community „${groupName}“ bei OHealth.`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "OHealth", text, url });
      } catch {
        // Teilen abgebrochen: nichts zu tun.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link kopiert");
    } catch {
      setStatus("Kopieren nicht möglich. Markier den Link und kopier ihn von Hand.");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm break-all select-all">{url}</p>
      <Button variant="outline" onClick={share}>
        Link teilen
      </Button>
      {status && (
        <p role="status" className="text-sm">
          {status}
        </p>
      )}
    </div>
  );
}
