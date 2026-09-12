import { redirect } from "next/navigation";
import { ClockScreen } from "@/components/clock-screen";
import type { Attendance, DelayNotice } from "@/lib/database.types";
import { requireProfile } from "@/lib/require-profile";
import { scheduleFromProfile } from "@/lib/schedule";
import { addDays, todayIstDate } from "@/lib/time";

export const dynamic = "force-dynamic";

const attendanceFields =
  "id, user_id, work_date, clock_in, clock_out, status, status_reason" as const;

export default async function ClockPage() {
  const { supabase, user, isAdmin, profile } = await requireProfile();

  if (isAdmin) {
    redirect("/admin");
  }

  const today = todayIstDate();
  const from = addDays(today, -7);

  const [{ data: rows }, { data: delayRow }] = await Promise.all([
    supabase
      .from("attendance")
      .select(attendanceFields)
      .eq("user_id", user.id)
      .gte("work_date", from)
      .lte("work_date", today)
      .order("work_date", { ascending: false }),
    supabase
      .from("delay_notices")
      .select("id, user_id, work_date, eta, reason, message, created_at")
      .eq("user_id", user.id)
      .eq("work_date", today)
      .maybeSingle(),
  ]);

  const recent = (rows ?? []) as Attendance[];
  const todayRow = recent.find((row) => row.work_date === today) ?? null;

  return (
    <main>
      <ClockScreen
        today={todayRow}
        recent={recent}
        schedule={scheduleFromProfile(profile)}
        delayNotice={(delayRow as DelayNotice | null) ?? null}
      />
    </main>
  );
}
