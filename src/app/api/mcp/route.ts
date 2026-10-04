import { createMcpHandler } from "@modelcontextprotocol/server";

import { bearerToken, CORS_HEADERS, unauthorized } from "@/lib/mcp-auth";
import { createAgentClient, verifyAgentToken } from "@/lib/supabase/agent";
import { createTrainingMcpServer } from "@/modules/workouts/mcp";
import { createAgentDataSource } from "@/modules/workouts/queries";

// MCP-Endpunkt für KI-Assistenten (Claude, ChatGPT und andere).
// Anmeldung: OAuth 2.1 über Supabase Auth, Bestätigung unter /oauth/consent.
// Zugriff: nur eigene Daten, lesend; schreibend nur eigene Vorlagen (docs/ENGINEERING.md, Abschnitt 5).

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Zustandslos: Für jede Anfrage entsteht ein eigener Server mit dem Token dieser Anfrage.
const handler = createMcpHandler(({ authInfo }) => {
  const userId = authInfo?.extra?.userId;
  if (!authInfo || typeof userId !== "string") {
    throw new Error("MCP-Anfrage ohne geprüfte Anmeldung");
  }
  const supabase = createAgentClient(authInfo.token);
  return createTrainingMcpServer(createAgentDataSource(supabase, userId));
});

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function handle(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;

  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return unauthorized(origin, false);

  const identity = await verifyAgentToken(token);
  if (!identity) return unauthorized(origin, true);

  const response = await handler.fetch(request, {
    authInfo: { token, clientId: identity.clientId, scopes: [], extra: { userId: identity.userId } },
  });
  return withCors(response);
}

export { handle as DELETE, handle as GET, handle as POST };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
