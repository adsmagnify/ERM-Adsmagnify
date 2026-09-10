import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { requireSupabaseEnv } from "@/lib/supabase/env";

export async function createClient() {
  const { url, key } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
          Object.entries(headers).forEach(([headerName, headerValue]) => {
            void headerName;
            void headerValue;
          });
        } catch {
          // Called from a Server Component; proxy refreshes the session.
        }
      },
    },
  });
}
