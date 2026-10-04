"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/result";

import { acceptInvite, requestPasswordReset, updateDisplayName, updatePassword } from "../actions";

const initial: FormState = {};

function Feedback({ state }: { state: FormState }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      )}
    </>
  );
}

export function RequestResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <Feedback state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        Link anfordern
      </Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password">Neues Passwort</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <Feedback state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        Passwort speichern
      </Button>
    </form>
  );
}

export function DisplayNameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, initial);

  return (
    <form action={action} className="max-w-sm space-y-3">
      <div className="space-y-2">
        <Label htmlFor="displayName">Name</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={current}
          autoComplete="nickname"
          maxLength={40}
          required
        />
      </div>
      <Feedback state={state} />
      <Button type="submit" className="w-full md:w-auto" disabled={pending}>
        Namen speichern
      </Button>
    </form>
  );
}

export function AcceptInviteForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(acceptInvite, initial);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="code" value={code} />
      <Feedback state={state} />
      <Button type="submit" className="w-full md:w-auto" disabled={pending}>
        Gruppe beitreten
      </Button>
    </form>
  );
}
