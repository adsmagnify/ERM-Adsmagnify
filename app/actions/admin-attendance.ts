"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth-user";
import type { DayStatus } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const statuses: DayStatus[] = ["Full day", "Half day"];

export async function setAttendanceStatus(
  attendanceId: string,
  status: DayStatus
) {
  if (!statuses.includes(status)) {
    return { error: "Choose Full day or Half day." };
  }

  const supabase = await createClient();
  const actorId = await getAuthUserId(supabase);

  if (!actorId) {
    return { error: "You need to be signed in." };
  }

  const { data: actor } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", actorId)
    .maybeSingle();

  if (actor?.role !== "admin") {
    return { error: "Only an admin can change day status." };
  }

  const admin = createAdminClient();
  const { data: row, error: lookupError } = await admin
    .from("attendance")
    .select("id, clock_out, status")
    .eq("id", attendanceId)
    .maybeSingle();

  if (lookupError) {
    if (/status_overridden/i.test(lookupError.message)) {
      return {
        error:
          "Run supabase/migrations/20260314000000_admin_status_override.sql in the Supabase SQL Editor, then try again.",
      };
    }
    return { error: lookupError.message };
  }

  if (!row?.clock_out) {
    return { error: "Wait until they clock out, then set Full day or Half day." };
  }

  const { error } = await admin
    .from("attendance")
    .update({
      status,
      status_overridden: true,
    })
    .eq("id", attendanceId);

  if (error) {
    if (/status_overridden/i.test(error.message) || /schema cache/i.test(error.message)) {
      return {
        error:
          "Run supabase/migrations/20260314000000_admin_status_override.sql in the Supabase SQL Editor, then try again.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return {};
}
