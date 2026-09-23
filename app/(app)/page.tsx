import { redirect } from "next/navigation";
import { ClockScreen } from "@/components/clock-screen";
import type { Attendance, DelayNotice, LeaveRequest } from "@/lib/database.types";
import { closeOpenAttendance } from "@/lib/close-open-attendance";
import { requireProfile } from "@/lib/require-profile";
import { scheduleFromProfile } from "@/lib/schedule";
import { addDays, todayIstDate } from "@/lib/time";

export const dynamic = "force-dynamic";

const attendanceFields =
  "id, user_id, work_date, clock_in, clock_out, status, status_reason, auto_clocked_out" as const;

export default async function ClockPage() {
  const { supabase, user, isAdmin, profile } = await requireProfile();

  if (isAdmin) {
    redirect("/admin");
  }

  await closeOpenAttendance();

  const today = todayIstDate();
  const from = addDays(today, -7);

  const [{ data: rows, error: attendanceError }, { data: delayRow }, { data: leaveRows }] =
    await Promise.all([
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
      supabase
        .from("leave_requests")
        .select("id, user_id, kind, from_date, to_date, reason, status, created_at")
        .eq("user_id", user.id)
        .lte("from_date", today)
        .gte("to_date", from)
        .in("status", ["Pending", "Approved"]),
    ]);

  let recent = (rows ?? []) as Attendance[];
  if (attendanceError) {
    const fallback = await supabase
      .from("attendance")
      .select(
        "id, user_id, work_date, clock_in, clock_out, status, status_reason"
      )
      .eq("user_id", user.id)
      .gte("work_date", from)
      .lte("work_date", today)
      .order("work_date", { ascending: false });
    recent = ((fallback.data ?? []) as Omit<Attendance, "auto_clocked_out">[]).map(
      (row) => ({ ...row, auto_clocked_out: false })
    ) as Attendance[];
  }
  const todayRow = recent.find((row) => row.work_date === today) ?? null;

  return (
    <main>
      <ClockScreen
        today={todayRow}
        recent={recent}
        schedule={scheduleFromProfile(profile)}
        delayNotice={(delayRow as DelayNotice | null) ?? null}
        leaves={(leaveRows ?? []) as LeaveRequest[]}
      />
    </main>
  );
}
