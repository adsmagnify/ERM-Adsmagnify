import { cache } from "react";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export const requireProfile = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const email = typeof claims?.email === "string" ? claims.email : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .eq("id", userId)
    .maybeSingle();

  return {
    supabase,
    user: { id: userId, email },
    profile: profile as Profile | null,
    isAdmin: profile?.role === "admin",
  };
});
