"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Passkey = { id: string; friendly_name?: string | null; created_at: string };

const dateFormat = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" });

// Passkeys dieses Kontos: einrichten, anzeigen, entfernen.
export function PasskeySetup() {
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error } = await createClient().auth.passkey.list();
    setPasskeys(error || !data ? [] : data);
  }

  useEffect(() => {
    let active = true;
    createClient()
      .auth.passkey.list()
      .then(({ data, error }) => {
        if (active) setPasskeys(error || !data ? [] : data);
      });
    return () => {
      active = false;
    };
  }, []);

  async function register() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.registerPasskey();
    if (error) {
      setError("Der Passkey konnte nicht eingerichtet werden. Versuch es erneut.");
    }
    await load();
    setBusy(false);
  }

  async function remove(passkeyId: string) {
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.passkey.delete({ passkeyId });
    if (error) setError("Der Passkey konnte nicht entfernt werden. Versuch es erneut.");
    await load();
    setBusy(false);
  }

  return (
    <div className="max-w-xl space-y-3">
      {passkeys && passkeys.length > 0 && (
        <ul>
          {passkeys.map((passkey) => (
            <li key={passkey.id} className="flex min-h-14 items-center gap-3 border-b">
              <span className="min-w-0 flex-1 truncate">
                {passkey.friendly_name || "Passkey"}
                <span className="text-muted-foreground text-sm">
                  {", eingerichtet am "}
                  {dateFormat.format(new Date(passkey.created_at))}
                </span>
              </span>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove(passkey.id)}>
                Entfernen
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button variant="outline" disabled={busy} onClick={register}>
        Passkey einrichten
      </Button>
    </div>
  );
}
