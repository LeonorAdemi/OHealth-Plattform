"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/result";

import { decideAgentAccess, revokeAgentAccess } from "../actions";

const initial: FormState = {};

/** Erlauben oder Ablehnen auf der Bestätigungsseite /oauth/consent. */
export function AgentConsentForm({ authorizationId }: { authorizationId: string }) {
  const [state, action, pending] = useActionState(decideAgentAccess, initial);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="authorizationId" value={authorizationId} />
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <div className="flex flex-col gap-3 md:flex-row">
        <Button type="submit" name="decision" value="approve" disabled={pending}>
          Zugriff erlauben
        </Button>
        <Button type="submit" name="decision" value="deny" variant="outline" disabled={pending}>
          Ablehnen
        </Button>
      </div>
    </form>
  );
}

/** Eine verbundene KI-App im Profil, mit „Zugriff entziehen". */
export function ConnectedAgent({ clientId, name, since }: { clientId: string; name: string; since: string }) {
  const [state, action, pending] = useActionState(revokeAgentAccess, initial);

  return (
    <li className="flex min-h-14 items-center justify-between gap-3 border-b">
      <div className="min-w-0">
        <p className="truncate">{name}</p>
        <p className="text-muted-foreground text-sm">verbunden seit {since}</p>
        {state.error && (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
      </div>
      <form action={action}>
        <input type="hidden" name="clientId" value={clientId} />
        <Button type="submit" variant="ghost" size="sm" disabled={pending}>
          Zugriff entziehen
        </Button>
      </form>
    </li>
  );
}

/** Adresse des MCP-Endpunkts zum Kopieren, für die Verbindung in Claude oder ChatGPT. */
export function McpAddress({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2">
      <p className="num break-all">{url}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Kopiert" : "Adresse kopieren"}
      </Button>
    </div>
  );
}
