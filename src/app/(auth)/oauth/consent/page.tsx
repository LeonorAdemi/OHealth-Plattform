import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AgentConsentView } from "@/modules/core/components/agent-consent";
import { getAgentAuthorization } from "@/modules/core/queries";

// Bestätigungsseite für KI-Apps, die über MCP auf die eigenen Trainingsdaten zugreifen wollen.
// Supabase Auth leitet hierher weiter (Authentication, OAuth Server, Authorization path).
// Ohne Anmeldung leitet src/proxy.ts zuerst zur Anmeldung und danach hierher zurück.

export const metadata: Metadata = { title: "KI-Zugriff" };

function Invalid() {
  return (
    <>
      <h1 className="text-titel font-semibold">Anfrage abgelaufen</h1>
      <p className="mt-4">
        Diese Anfrage funktioniert nicht mehr. Starte die Verbindung in deiner KI-App neu.
      </p>
    </>
  );
}

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: id } = await searchParams;
  if (!id || id.length > 200 || !/^[A-Za-z0-9._~-]+$/.test(id)) return <Invalid />;

  const request = await getAgentAuthorization(id);
  if (!request) return <Invalid />;
  if (request.kind === "redirect") redirect(request.url);

  return <AgentConsentView authorizationId={id} request={request} />;
}
