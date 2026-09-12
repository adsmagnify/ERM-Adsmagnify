"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth-user";
import { sendDelayEmail } from "@/lib/smtp";
import { type DelayEmailInput } from "@/lib/delay-email";
import { clockInByForDate, scheduleFromProfile } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import {
  formatIstTime,
  istDateTime,
  todayIstDate,
} from "@/lib/time";

export type DelayActionState = {
  error?: string;
  success?: boolean;
};

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function submitDelayNotice(
  formData: FormData
): Promise<DelayActionState> {
  const reason = formString(formData, "reason");
  const message = formString(formData, "message");
  const etaTime = formString(formData, "eta");

  if (!reason) {
    return { error: "Add a reason." };
  }

  if (!message) {
    return { error: "Add a short message." };
  }

  if (!/^\d{2}:\d{2}$/.test(etaTime)) {
    return { error: "Choose an arrival time." };
  }

  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return { error: "You need to be signed in." };
  }

  const [{ data: profile }, { data: todayRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, email, role, clock_in_by, clock_out_after, wednesday_clock_in_by"
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("attendance")
      .select("clock_in")
      .eq("user_id", userId)
      .eq("work_date", todayIstDate())
      .maybeSingle(),
  ]);

  if (profile?.role === "admin") {
    return { error: "Admins do not send delay notices." };
  }

  if (todayRow?.clock_in) {
    return { error: "You already clocked in today." };
  }

  const today = todayIstDate();
  const schedule = scheduleFromProfile(profile);
  const clockInBy = clockInByForDate(schedule, today);
  const eta = istDateTime(today, etaTime);

  if (Number.isNaN(eta.getTime())) {
    return { error: "Choose a valid arrival time." };
  }

  const { error } = await supabase.from("delay_notices").upsert(
    {
      user_id: userId,
      work_date: today,
      eta: eta.toISOString(),
      reason,
      message,
    },
    { onConflict: "user_id,work_date" }
  );

  if (error) {
    if (/delay_notices/i.test(error.message) && /schema cache/i.test(error.message)) {
      return {
        error:
          "Delay notices are not set up in the database yet. Run supabase/migrations/20260312000001_delay_notices.sql in the Supabase SQL Editor, then try again.",
      };
    }
    return { error: error.message };
  }

  const name = profile?.full_name?.trim() || profile?.email || "Employee";
  const email = profile?.email || "";
  const composeInput: DelayEmailInput = {
    name,
    email,
    workDate: today,
    clockInBy,
    etaLabel: formatIstTime(eta.toISOString()),
    reason,
    message,
  };
  const sent = await sendDelayEmail(composeInput);
  if (sent.error) {
    return { error: sent.error };
  }

  revalidatePath("/");
  revalidatePath("/delay");
  revalidatePath("/admin");
  revalidatePath("/admin/delays");

  return { success: true };
}
