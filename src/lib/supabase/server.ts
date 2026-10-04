import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

// Supabase-Client für Server Components, Server Actions und Route Handler.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // In Server Components dürfen keine Cookies gesetzt werden.
          // Die Sitzung wird stattdessen in src/proxy.ts erneuert.
        }
      },
    },
  });
}
