import { redirect } from "next/navigation";
import { AdminToday } from "@/components/admin-today";
import type { Attendance, DelayNotice, Profile } from "@/lib/database.types";
import { closeOpenAttendance } from "@/lib/close-open-attendance";
import { requireProfile } from "@/lib/require-profile";
import { todayIstDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { supabase, isAdmin } = await requireProfile();

  if (!isAdmin) {
    redirect("/");
  }

  await closeOpenAttendance();

  const today = todayIstDate();

  const [{ data: people }, attendanceResult, { data: delays }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, email, role, created_at, clock_in_by, clock_out_after, wednesday_clock_in_by"
        )
        .order("created_at", { ascending: true }),
      supabase
        .from("attendance")
        .select(
          "id, user_id, work_date, clock_in, clock_out, status, status_reason, status_overridden, auto_clocked_out"
        )
        .eq("work_date", today),
      supabase
        .from("delay_notices")
        .select("id, user_id, work_date, eta, reason, message, created_at")
        .eq("work_date", today),
    ]);

  let attendance = (attendanceResult.data ?? []) as Attendance[];
  if (attendanceResult.error) {
    const fallback = await supabase
      .from("attendance")
      .select(
        "id, user_id, work_date, clock_in, clock_out, status, status_reason"
      )
      .eq("work_date", today);
    attendance = ((fallback.data ?? []) as Omit<
      Attendance,
      "status_overridden" | "auto_clocked_out"
    >[]).map((row) => ({
      ...row,
      status_overridden: false,
      auto_clocked_out: false,
    })) as Attendance[];
  }

  return (
    <main>
      <AdminToday
        people={(people ?? []) as Profile[]}
        attendance={(attendance ?? []) as Attendance[]}
        delays={(delays ?? []) as DelayNotice[]}
      />
    </main>
  );
}
