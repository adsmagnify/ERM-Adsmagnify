import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { requireServiceRoleKey, requireSupabaseEnv } from "@/lib/supabase/env";

export function createAdminClient() {
  const { url } = requireSupabaseEnv();
  const serviceRole = requireServiceRoleKey();

  return createClient<Database>(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
