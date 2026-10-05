"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { respondChatRequest } from "../actions";

function Respond({ chatId, accept, children }: { chatId: string; accept: boolean; children: React.ReactNode }) {
  const [state, action, pending] = useActionState(respondChatRequest, {});
  return (
    <form action={action} className="flex-1 md:flex-none">
      <input type="hidden" name="chatId" value={chatId} />
      <input type="hidden" name="accept" value={accept ? "yes" : "no"} />
      <Button type="submit" variant={accept ? "default" : "outline"} disabled={pending} className="w-full md:w-auto">
        {children}
      </Button>
      {state.error && (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Nachrichtenanfrage im Chat: annehmen oder ablehnen. Eine Antwort nimmt sie ebenfalls an. */
export function ChatRequestBar({ chatId, name }: { chatId: string; name: string }) {
  return (
    <div className="border-b py-4">
      <p>{name} möchte dir schreiben.</p>
      <p className="text-muted-foreground mt-1 text-sm">
        Nimmst du an oder antwortest, könnt ihr chatten. Lehnst du ab, wird der Chat gelöscht.
      </p>
      <div className="mt-3 flex gap-3">
        <Respond chatId={chatId} accept>
          Annehmen
        </Respond>
        <Respond chatId={chatId} accept={false}>
          Ablehnen
        </Respond>
      </div>
    </div>
  );
}
