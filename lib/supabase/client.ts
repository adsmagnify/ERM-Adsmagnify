import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { authCookieOptions } from "@/lib/supabase/auth-cookies";
import { requireSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const { url, key } = requireSupabaseEnv();
  return createBrowserClient<Database>(url, key, {
    cookieOptions: authCookieOptions,
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
