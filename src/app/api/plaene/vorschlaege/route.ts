import type { NextRequest } from "next/server";

import { getSports } from "@/modules/core/queries";
import { MAX_QUERY, MIN_SUGGEST, sportLookup, suggestCatalog } from "@/modules/plans/logic";
import { getCatalog } from "@/modules/plans/queries";

// Vorschläge beim Tippen in „Pläne und Einheiten suchen“ (docs/bereiche/plaene.md). Nur lesend und
// nur angemeldet: getSports prüft die Anmeldung und leitet sonst zur Anmeldung um.
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, MAX_QUERY);
  if (q.trim().length < MIN_SUGGEST) return Response.json({ groups: [], total: 0 });
  const sports = sportLookup(await getSports());
  return Response.json(suggestCatalog(getCatalog(), q, sports), {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
