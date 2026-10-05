"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/result";

import { signIn, signUp } from "../actions";
import { withNext } from "../logic";
import { SocialLogin } from "./social-login";
import { TermsCheckbox } from "./terms-consent";

const initial: FormState = {};

// next ist das Ziel nach der Anmeldung, z. B. ein Einladungslink.
export function AuthForm({
  mode,
  next,
  initialError,
}: {
  mode: "login" | "register";
  next: string;
  initialError?: string;
}) {
  const isRegister = mode === "register";
  const [state, action, pending] = useActionState(
    isRegister ? signUp : signIn,
    initial,
  );
  const error = state.error ?? (state.message ? undefined : initialError);

  return (
    <div className="space-y-6">
      <SocialLogin next={next} mode={mode} />

      <form action={action} className="space-y-5">
        <input type="hidden" name="next" value={next} />

        {isRegister && (
          <div className="space-y-2">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              name="displayName"
              autoComplete="nickname"
              maxLength={40}
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={8}
            required
          />
          {!isRegister && (
            <p className="text-sm">
              <Link
                href="/passwort-vergessen"
                className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4"
              >
                Passwort vergessen
              </Link>
            </p>
          )}
        </div>

        {isRegister && <TermsCheckbox />}

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        {state.message && (
          <p role="status" className="text-sm">
            {state.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {isRegister ? "Konto erstellen" : "Anmelden"}
        </Button>

        {isRegister && (
          <p className="text-muted-foreground text-sm">
            Wie wir mit deinen Daten umgehen, steht in der{" "}
            <Link
              href="/datenschutz"
              className="text-foreground underline underline-offset-4"
            >
              Datenschutzerklärung
            </Link>
            .
          </p>
        )}

        <p className="text-muted-foreground text-sm">
          {isRegister ? "Schon ein Konto? " : "Noch kein Konto? "}
          <Link
            href={withNext(isRegister ? "/login" : "/registrieren", next)}
            className="text-foreground underline underline-offset-4"
          >
            {isRegister ? "Anmelden" : "Konto erstellen"}
          </Link>
        </p>
      </form>
    </div>
  );
}
