"use server";

import { getAuthUserId } from "@/lib/auth-user";
import { sendDailyDayReport } from "@/lib/daily-report";
import { createClient } from "@/lib/supabase/server";
import { isIsoDate } from "@/lib/time";

export async function sendDailyReport(workDate: string) {
  if (!isIsoDate(workDate)) {
    return { error: "Choose a valid date." };
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
    return { error: "Only an admin can send the day report." };
  }

  return sendDailyDayReport(workDate);
}
