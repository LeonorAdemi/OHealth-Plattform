import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

// Supabase-Client für den Browser. Nur für die Anmeldung über Drittanbieter nötig,
// alle Datenzugriffe laufen weiterhin über den Server (docs/ENGINEERING.md, Abschnitt 3).
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient<Database>(url, key);
}
