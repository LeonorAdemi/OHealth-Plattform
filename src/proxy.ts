import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Ohne Sitzungsprüfung: statische Dateien sowie MCP-Endpunkt und OAuth-Metadaten,
  // die sich selbst per Bearer-Token schützen bzw. öffentlich sind.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|api/mcp|api/push|sw\\.js|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|webp|woff2)$).*)",
  ],
};
