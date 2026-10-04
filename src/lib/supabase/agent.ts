import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

// Supabase-Zugang für KI-Clients, die über MCP (/api/mcp) zugreifen.
// Das Token stellt Supabase Auth über seinen OAuth-2.1-Server aus. Es trägt den Claim
// client_id, und die Datenbank beschränkt solche Tokens auf eigene Daten, lesend, mit
// Schreibrecht nur für eigene Vorlagen (Migrationen agent_read_only und agent_write_templates,
// docs/ENGINEERING.md, Abschnitt 5).

export type AgentClient = SupabaseClient<Database>;
export type AgentIdentity = { userId: string; clientId: string };

let verifier: AgentClient | null = null;

function getVerifier(): AgentClient {
  if (!verifier) {
    const { url, key } = supabaseEnv();
    verifier = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return verifier;
}

/**
 * Prüft Signatur und Ablauf eines Bearer-Tokens. Akzeptiert nur Tokens, die Supabase Auth
 * für einen OAuth-Client ausgestellt hat. Sitzungstokens der App selbst werden abgelehnt,
 * damit die Einschränkungen für KI-Zugriffe immer greifen.
 */
export async function verifyAgentToken(token: string): Promise<AgentIdentity | null> {
  let result: Awaited<ReturnType<AgentClient["auth"]["getClaims"]>>;
  try {
    result = await getVerifier().auth.getClaims(token);
  } catch {
    // Kein lesbares JWT
    return null;
  }
  const { data, error } = result;
  if (error || !data) return null;

  const claims = data.claims as Record<string, unknown>;
  if (claims.role !== "authenticated") return null;
  if (typeof claims.sub !== "string" || claims.sub === "") return null;
  if (typeof claims.client_id !== "string" || claims.client_id === "") return null;

  return { userId: claims.sub, clientId: claims.client_id };
}

/** Client, dessen Abfragen mit dem Token der KI laufen. Row Level Security gilt. */
export function createAgentClient(token: string): AgentClient {
  const { url, key } = supabaseEnv();
  return createClient<Database>(url, key, {
    accessToken: async () => token,
  });
}
