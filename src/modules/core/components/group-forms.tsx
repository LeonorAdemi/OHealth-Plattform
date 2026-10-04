"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/result";

import { createGroup, joinGroup } from "../actions";

const initial: FormState = {};

// primary bestimmt, welches der beiden Formulare den einen gefüllten Button der Ansicht bekommt.
export function GroupForms({ primary }: { primary: "join" | "none" }) {
  const [joinState, joinAction, joining] = useActionState(joinGroup, initial);
  const [createState, createAction, creating] = useActionState(createGroup, initial);

  return (
    <div className="grid max-w-xl gap-8 md:grid-cols-2">
      <form action={joinAction} className="space-y-2">
        <Label htmlFor="code">Einladungscode</Label>
        <Input id="code" name="code" autoComplete="off" autoCapitalize="none" required />
        {joinState.error && (
          <p role="alert" className="text-destructive text-sm">
            {joinState.error}
          </p>
        )}
        <Button
          type="submit"
          variant={primary === "join" ? "default" : "outline"}
          className="mt-2 w-full"
          disabled={joining}
        >
          Gruppe beitreten
        </Button>
      </form>

      <form action={createAction} className="space-y-2">
        <Label htmlFor="name">Name der neuen Gruppe</Label>
        <Input id="name" name="name" maxLength={60} required />
        {createState.error && (
          <p role="alert" className="text-destructive text-sm">
            {createState.error}
          </p>
        )}
        <Button type="submit" variant="outline" className="mt-2 w-full" disabled={creating}>
          Gruppe erstellen
        </Button>
      </form>
    </div>
  );
}
