import { CORS_HEADERS } from "@/lib/mcp-auth";
import { supabaseEnv } from "@/lib/supabase/env";

// Für ältere MCP-Clients, die die Anmelde-Metadaten auf der Domain des Endpunkts suchen
// statt über /.well-known/oauth-protected-resource. Gibt die Metadaten von
// Supabase Auth unverändert weiter. Anmeldeserver bleibt Supabase.

export const revalidate = 3600;

export async function GET() {
  const url = `${supabaseEnv().url.replace(/\/+$/, "")}/.well-known/oauth-authorization-server/auth/v1`;
  try {
    const upstream = await fetch(url, { next: { revalidate: 3600 } });
    if (!upstream.ok) throw new Error(String(upstream.status));
    return Response.json(await upstream.json(), { headers: CORS_HEADERS });
  } catch {
    return Response.json(
      { error: "temporarily_unavailable", error_description: "Anmeldeserver nicht erreichbar." },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
