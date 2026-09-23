"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth-user";
import type { LeaveStatus } from "@/lib/database.types";
import { sendLeaveEmail } from "@/lib/smtp";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const statuses: LeaveStatus[] = ["Pending", "Approved", "Rejected"];

export async function setLeaveStatus(leaveId: string, status: LeaveStatus) {
  if (!statuses.includes(status)) {
    return { error: "Choose Pending, Approved, or Rejected." };
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
    return { error: "Only an admin can change leave status." };
  }

  const admin = createAdminClient();
  const { data: leaveRow, error: lookupError } = await admin
    .from("leave_requests")
    .select("id, user_id, kind, from_date, to_date, reason, status")
    .eq("id", leaveId)
    .maybeSingle();

  if (lookupError) {
    if (/leave_requests/i.test(lookupError.message) && /schema cache|could not find/i.test(lookupError.message)) {
      return {
        error:
          "Leave requests are not set up yet. Run supabase/migrations/20260316000000_leave_requests.sql in the Supabase SQL Editor, then try again.",
      };
    }
    return { error: lookupError.message };
  }

  if (!leaveRow) {
    return { error: "Leave request not found." };
  }

  const { error } = await admin
    .from("leave_requests")
    .update({ status })
    .eq("id", leaveId);

  if (error) {
    if (/leave_requests/i.test(error.message) && /schema cache|could not find/i.test(error.message)) {
      return {
        error:
          "Leave requests are not set up yet. Run supabase/migrations/20260316000000_leave_requests.sql in the Supabase SQL Editor, then try again.",
      };
    }
    return { error: error.message };
  }

  if (status === "Approved" || status === "Rejected") {
    const { data: person } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", leaveRow.user_id)
      .maybeSingle();

    await sendLeaveEmail({
      name: person?.full_name?.trim() || person?.email || "Employee",
      email: person?.email || "",
      kind: leaveRow.kind,
      fromDate: leaveRow.from_date,
      toDate: leaveRow.to_date,
      reason: leaveRow.reason,
      status,
    });
  }

  revalidatePath("/leaves");
  revalidatePath("/admin/leaves");
  revalidatePath("/admin");
  revalidatePath("/");
  return {};
}
