import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";
import { safeNextPath } from "@/lib/safe-next-path";
import { supabaseEnv } from "@/lib/supabase/env";

const PUBLIC_PATHS = [
  "/login",
  "/registrieren",
  "/passwort-vergessen",
  "/auth",
  "/impressum",
  "/datenschutz",
  "/nutzungsbedingungen",
  // Teilen-Link einer Community: Vorschau auch ohne Konto
  "/beitreten",
  // Öffentlicher Link eines Events (nur Events in öffentlichen Communities, prüft die Datenbank)
  "/e",
];

// Erneuert die Sitzung einmal je Anfrage und leitet je nach Anmeldestatus um.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (!signedIn && !isPublic) {
    // Das eigentliche Ziel merken, damit z. B. ein Einladungslink die Anmeldung übersteht.
    const wanted = path + request.nextUrl.search;
    const target =
      wanted === "/" ? "/login" : `/login?next=${encodeURIComponent(wanted)}`;
    return redirectKeepingCookies(request, response, target);
  }
  if (signedIn && (path === "/login" || path === "/registrieren")) {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    return redirectKeepingCookies(request, response, next);
  }

  return response;
}

function redirectKeepingCookies(
  request: NextRequest,
  from: NextResponse,
  target: string,
) {
  const redirect = NextResponse.redirect(new URL(target, request.url));
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
