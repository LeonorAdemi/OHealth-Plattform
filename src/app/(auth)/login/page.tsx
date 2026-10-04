import type { Metadata } from "next";

import { safeNextPath } from "@/lib/safe-next-path";
import { AuthForm } from "@/modules/core/components/auth-form";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; fehler?: string; geloescht?: string }>;
}) {
  const { next, fehler, geloescht } = await searchParams;

  return (
    <>
      <h1 className="text-titel font-semibold">Anmelden</h1>
      {geloescht && (
        <p role="status" className="mt-4">
          Dein Konto und alle deine Daten wurden gelöscht.
        </p>
      )}
      <div className="mt-8">
        <AuthForm
          mode="login"
          next={safeNextPath(next)}
          initialError={fehler ? "Die Anmeldung hat nicht geklappt. Versuch es erneut." : undefined}
        />
      </div>
    </>
  );
}
