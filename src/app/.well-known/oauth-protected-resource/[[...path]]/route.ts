import { CORS_HEADERS, resourceMetadata } from "@/lib/mcp-auth";
import { supabaseEnv } from "@/lib/supabase/env";

// OAuth 2.0 Protected Resource Metadata (RFC 9728) für den MCP-Endpunkt.
// Erreichbar unter /.well-known/oauth-protected-resource und, wie es die
// MCP-Spezifikation bevorzugt, unter /.well-known/oauth-protected-resource/api/mcp.

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return Response.json(resourceMetadata(origin, supabaseEnv().url), {
    headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=3600" },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
