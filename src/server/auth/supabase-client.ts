import { createClient } from "@supabase/supabase-js";

let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (supabaseAdminClient) return supabaseAdminClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  supabaseAdminClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return supabaseAdminClient;
}
