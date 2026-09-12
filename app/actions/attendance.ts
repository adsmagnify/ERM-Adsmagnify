"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth-user";
import {
  assertAtOffice,
  getClientPublicIp,
  loadOfficeSettings,
} from "@/lib/office-server";
import { closeOpenAttendance } from "@/lib/close-open-attendance";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { todayIstDate } from "@/lib/time";

export type ActionResult = { error?: string };

export type ClockPayload = {
  lat: number;
  lng: number;
  accuracy: number;
};

async function requireEmployeeClock(payload: ClockPayload) {
  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return { ok: false as const, error: "You need to be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role === "admin") {
    return { ok: false as const, error: "Admins do not clock in or out." };
  }

  const [office, ip] = await Promise.all([
    loadOfficeSettings(supabase),
    getClientPublicIp(),
  ]);
  const presence = assertAtOffice(office, ip, payload);

  if (presence.error) {
    return { ok: false as const, error: presence.error };
  }

  return {
    ok: true as const,
    userId,
    ip,
    fix: presence.fix,
  };
}

export async function clockIn(payload: ClockPayload): Promise<ActionResult> {
  const ready = await requireEmployeeClock(payload);
  if (!ready.ok) {
    return { error: ready.error };
  }

  const admin = createAdminClient();
  await closeOpenAttendance();
  const { error } = await admin.from("attendance").insert({
    user_id: ready.userId,
    work_date: todayIstDate(),
    clock_in_lat: ready.fix?.lat ?? null,
    clock_in_lng: ready.fix?.lng ?? null,
    clock_in_accuracy: ready.fix?.accuracy ?? null,
    clock_in_ip: ready.ip,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Already clocked in today" };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

export async function clockOut(payload: ClockPayload): Promise<ActionResult> {
  const ready = await requireEmployeeClock(payload);
  if (!ready.ok) {
    return { error: ready.error };
  }

  const admin = createAdminClient();
  const { data: row, error: lookupError } = await admin
    .from("attendance")
    .select("id, clock_out")
    .eq("user_id", ready.userId)
    .eq("work_date", todayIstDate())
    .maybeSingle();

  if (lookupError) {
    return { error: lookupError.message };
  }

  if (!row) {
    return { error: "Clock in first" };
  }

  if (row.clock_out) {
    return { error: "Already clocked out today" };
  }

  const { data: updated, error } = await admin
    .from("attendance")
    .update({
      clock_out: new Date().toISOString(),
      clock_out_lat: ready.fix?.lat ?? null,
      clock_out_lng: ready.fix?.lng ?? null,
      clock_out_accuracy: ready.fix?.accuracy ?? null,
      clock_out_ip: ready.ip,
    })
    .eq("id", row.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!updated) {
    return { error: "Could not clock out." };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}
