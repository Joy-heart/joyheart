import { createClient } from "@supabase/supabase-js";

/**
 * Server-only privileged client. SUPABASE_SERVICE_ROLE_KEY must be configured
 * as a Cloudflare Worker secret, never as a NEXT_PUBLIC_* variable or source literal.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured for the Worker.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "joyheart-photo-server" } },
  });
}
