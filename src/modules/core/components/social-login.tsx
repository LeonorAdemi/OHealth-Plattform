"use client";

import { Fingerprint } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

import { enabledProviders, passkeysEnabled, type AuthProvider } from "../logic";

// Ablauf nach der offiziellen Supabase-Vorlage "social-auth-nextjs".
// Welche Anbieter erscheinen, steuert NEXT_PUBLIC_AUTH_PROVIDERS (siehe .env.example).
// Dort nur eintragen, was in Supabase unter Authentication, Providers aktiviert ist.
const ACTIVE = enabledProviders(process.env.NEXT_PUBLIC_AUTH_PROVIDERS);
const PASSKEYS = passkeysEnabled(process.env.NEXT_PUBLIC_PASSKEYS);

// Fremdmarken behalten ihre Originalfarben (docs/DESIGN.md, Abschnitt 4).
const PROVIDERS: Record<AuthProvider, { label: string; Logo: () => React.ReactNode }> = {
  apple: { label: "Mit Apple anmelden", Logo: AppleLogo },
  google: { label: "Mit Google anmelden", Logo: GoogleLogo },
  facebook: { label: "Mit Facebook anmelden", Logo: FacebookLogo },
};

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="#0866FF">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  );
}

/**
 * Schnelle Anmeldewege über dem E-Mail-Formular: Passkey (nur beim Anmelden) und
 * die aktiven Anbieter. Ist nichts davon konfiguriert, erscheint nichts.
 */
export function SocialLogin({ next, mode }: { next: string; mode: "login" | "register" }) {
  const [pending, setPending] = useState<AuthProvider | "passkey" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showPasskey = PASSKEYS && mode === "login";
  if (ACTIVE.length === 0 && !showPasskey) return null;

  async function signInWith(provider: AuthProvider) {
    setPending(provider);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      // Bei Erfolg leitet der Browser zum Anbieter weiter, die Seite wird verlassen.
    } catch {
      setError("Die Anmeldung konnte nicht gestartet werden. Versuch es erneut.");
      setPending(null);
    }
  }

  async function signInWithPasskey() {
    setPending("passkey");
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPasskey();
      if (error || !data?.session) throw error ?? new Error("Keine Sitzung");
      // Volles Neuladen, damit der Server die neue Sitzung sieht.
      window.location.assign(next);
    } catch {
      setError(
        "Die Anmeldung per Passkey hat nicht geklappt. Einen Passkey richtest du nach der ersten Anmeldung im Profil ein.",
      );
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {showPasskey && (
          <Button
            variant="outline"
            className="w-full"
            disabled={pending !== null}
            onClick={signInWithPasskey}
          >
            <Fingerprint strokeWidth={1.5} />
            Mit Passkey anmelden
          </Button>
        )}
        {ACTIVE.map((id) => {
          const { label, Logo } = PROVIDERS[id];
          return (
            <Button
              key={id}
              variant="outline"
              className="w-full"
              disabled={pending !== null}
              onClick={() => signInWith(id)}
            >
              <Logo />
              {label}
            </Button>
          );
        })}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>

      <p className="text-muted-foreground flex items-center gap-3 text-sm">
        <span className="bg-border h-px flex-1" />
        oder mit E-Mail
        <span className="bg-border h-px flex-1" />
      </p>
    </div>
  );
}
