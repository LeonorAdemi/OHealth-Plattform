// Bausteine für die Anmeldung von KI-Clients am MCP-Endpunkt nach der MCP-Spezifikation:
// OAuth 2.0 Protected Resource Metadata (RFC 9728) und Bearer-Token (RFC 6750).
// Der Anmeldeserver ist Supabase Auth, dieser Endpunkt prüft nur das Token.

export const MCP_PATH = "/api/mcp";
export const RESOURCE_METADATA_PATH = `/.well-known/oauth-protected-resource${MCP_PATH}`;

/** Erlaubt Clients im Browser (etwa dem MCP Inspector), den Endpunkt aufzurufen. */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id, Mcp-Protocol-Version",
};

/** Liest das Token aus "Authorization: Bearer <token>". null, wenn keins da ist. */
export function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+([A-Za-z0-9\-._~+/]+=*)\s*$/i.exec(authorization);
  return match ? match[1] : null;
}

/** Ausgabe für /.well-known/oauth-protected-resource: wo sich ein Client anmelden muss. */
export function resourceMetadata(origin: string, supabaseUrl: string) {
  return {
    resource: `${origin}${MCP_PATH}`,
    authorization_servers: [`${supabaseUrl.replace(/\/+$/, "")}/auth/v1`],
    bearer_methods_supported: ["header"],
    resource_name: "OHealth",
  };
}

/**
 * Antwort 401 mit dem Hinweis, wo die Metadaten liegen. Daran erkennt ein MCP-Client,
 * dass er sich anmelden muss, und findet den Anmeldeserver.
 */
export function unauthorized(origin: string, invalidToken: boolean): Response {
  const parts = [`resource_metadata="${origin}${RESOURCE_METADATA_PATH}"`];
  if (invalidToken) parts.push('error="invalid_token"');
  return new Response(
    JSON.stringify({
      error: invalidToken ? "invalid_token" : "unauthorized",
      error_description: invalidToken
        ? "Das Token ist ungültig, abgelaufen oder nicht für KI-Zugriff ausgestellt."
        : "Anmeldung erforderlich.",
    }),
    {
      status: 401,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer ${parts.join(", ")}`,
      },
    },
  );
}
