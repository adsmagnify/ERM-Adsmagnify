import { cache } from "react";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

const profileFieldsWithLeave =
  "id, full_name, email, role, created_at, clock_in_by, clock_out_after, wednesday_clock_in_by, remote_ok, casual_total, sick_total, comp_off_total" as const;
const profileFieldsWithRemote =
  "id, full_name, email, role, created_at, clock_in_by, clock_out_after, wednesday_clock_in_by, remote_ok" as const;
const profileFields =
  "id, full_name, email, role, created_at, clock_in_by, clock_out_after, wednesday_clock_in_by" as const;

function withLeaveDefaults(
  row: Omit<Profile, "remote_ok" | "casual_total" | "sick_total" | "comp_off_total"> &
    Partial<
      Pick<Profile, "remote_ok" | "casual_total" | "sick_total" | "comp_off_total">
    >
): Profile {
  return {
    ...row,
    remote_ok: Boolean(row.remote_ok),
    casual_total: Number(row.casual_total ?? 0),
    sick_total: Number(row.sick_total ?? 0),
    comp_off_total: Number(row.comp_off_total ?? 0),
  };
}

export const requireProfile = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const email = typeof claims?.email === "string" ? claims.email : null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(profileFieldsWithLeave)
    .eq("id", userId)
    .maybeSingle();

  let resolved: Profile | null = null;
  if (!error && profile) {
    resolved = withLeaveDefaults(profile as Profile);
  } else {
    const remote = await supabase
      .from("profiles")
      .select(profileFieldsWithRemote)
      .eq("id", userId)
      .maybeSingle();
    if (remote.data) {
      resolved = withLeaveDefaults(remote.data as Profile);
    } else {
      const fallback = await supabase
        .from("profiles")
        .select(profileFields)
        .eq("id", userId)
        .maybeSingle();
      resolved = fallback.data
        ? withLeaveDefaults(fallback.data as Profile)
        : null;
    }
  }

  return {
    supabase,
    user: { id: userId, email },
    profile: resolved,
    isAdmin: resolved?.role === "admin",
  };
});
