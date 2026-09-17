"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth-user";
import type { LeaveKind } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { isIsoDate, todayIstDate } from "@/lib/time";

export type LeaveActionState = {
  error?: string;
  success?: boolean;
};

const kinds: LeaveKind[] = ["Casual", "Sick"];

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function setupError(message: string) {
  if (/leave_requests/i.test(message) && /schema cache|could not find/i.test(message)) {
    return {
      error:
        "Leave requests are not set up yet. Run supabase/migrations/20260316000000_leave_requests.sql in the Supabase SQL Editor, then try again.",
    };
  }
  return { error: message };
}

export async function requestLeave(
  formData: FormData
): Promise<LeaveActionState> {
  const kind = formString(formData, "kind") as LeaveKind;
  const fromDate = formString(formData, "from_date");
  const toDate = formString(formData, "to_date");
  const reason = formString(formData, "reason");

  if (!kinds.includes(kind)) {
    return { error: "Choose casual or sick leave." };
  }

  if (!isIsoDate(fromDate) || !isIsoDate(toDate)) {
    return { error: "Choose valid from and to dates." };
  }

  if (toDate < fromDate) {
    return { error: "The last day cannot be before the first day." };
  }

  if (!reason) {
    return { error: "Add a reason." };
  }

  const today = todayIstDate();
  if (fromDate < today) {
    return { error: "Leave cannot start in the past." };
  }

  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return { error: "You need to be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role === "admin") {
    return { error: "Admins do not request leave here." };
  }

  const { data: overlapping, error: overlapError } = await supabase
    .from("leave_requests")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["Pending", "Approved"])
    .lte("from_date", toDate)
    .gte("to_date", fromDate)
    .limit(1);

  if (overlapError) {
    return setupError(overlapError.message);
  }

  if (overlapping && overlapping.length > 0) {
    return { error: "You already have leave on those dates." };
  }

  const { error } = await supabase.from("leave_requests").insert({
    user_id: userId,
    kind,
    from_date: fromDate,
    to_date: toDate,
    reason,
  });

  if (error) {
    return setupError(error.message);
  }

  revalidatePath("/leaves");
  revalidatePath("/admin/leaves");
  return { success: true };
}
