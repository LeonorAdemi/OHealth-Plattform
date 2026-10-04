import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

// Supabase-Zugang ohne Sitzung (Rolle anon), für Aufrufe, die sich selbst schützen,
// etwa den Push-Versand mit gemeinsamem Geheimnis (Migration push_and_reminders).
let client: SupabaseClient<Database> | null = null;

export function createAnonClient(): SupabaseClient<Database> {
  if (!client) {
    const { url, key } = supabaseEnv();
    client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
