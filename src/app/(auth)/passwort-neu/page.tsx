import type { Metadata } from "next";

import { NewPasswordForm } from "@/modules/core/components/simple-forms";

export const metadata: Metadata = { title: "Neues Passwort" };

// Erreichbar über den Link aus der Mail (er meldet an) oder angemeldet aus dem Profil.
export default function NewPasswordPage() {
  return (
    <>
      <h1 className="text-titel font-semibold">Neues Passwort</h1>
      <div className="mt-8">
        <NewPasswordForm />
      </div>
    </>
  );
}
