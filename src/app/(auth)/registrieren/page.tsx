import type { Metadata } from "next";

import { safeNextPath } from "@/lib/safe-next-path";
import { AuthForm } from "@/modules/core/components/auth-form";

export const metadata: Metadata = { title: "Konto erstellen" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <>
      <h1 className="text-titel font-semibold">Konto erstellen</h1>
      <div className="mt-8">
        <AuthForm
          mode="register"
          // Ohne Einladung oder Event-Link geht es nach der Registrierung zum Einstieg
          next={safeNextPath(next) === "/" ? "/willkommen" : safeNextPath(next)}
        />
      </div>
    </>
  );
}
