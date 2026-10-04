import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Ziel nach der Anmeldung über Google und nach dem Bestätigungslink aus der
// Registrierungs-Mail. Aufbau nach der offiziellen Supabase-Vorlage "social-auth-nextjs".
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Nur interne Ziele zulassen, damit der Link nicht auf fremde Seiten umleiten kann.
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Hinter dem Vercel-Proxy steht die öffentliche Adresse im Header x-forwarded-host.
      const forwardedHost = request.headers.get("x-forwarded-host");
      if (process.env.NODE_ENV !== "development" && forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?fehler=anmeldung`);
}
