import { redirect } from "next/navigation";
import { AdminToday } from "@/components/admin-today";
import type { DayPresence } from "@/components/admin-month-calendar";
import type { Attendance, DelayNotice, Profile } from "@/lib/database.types";
import { closeOpenAttendance } from "@/lib/close-open-attendance";
import { requireProfile } from "@/lib/require-profile";
import { monthCalendar, parseWorkDate, todayIstDate } from "@/lib/time";

export const dynamic = "force-dynamic";

const attendanceFields =
  "id, user_id, work_date, clock_in, clock_out, status, status_reason, status_overridden, auto_clocked_out" as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { supabase, isAdmin } = await requireProfile();

  if (!isAdmin) {
    redirect("/");
  }

  await closeOpenAttendance();

  const params = await searchParams;
  const today = todayIstDate();
  const workDate = parseWorkDate(params.date, today);
  const grid = monthCalendar(workDate);
  const from = grid[0]?.date ?? workDate;
  const to = grid[grid.length - 1]?.date ?? workDate;

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
        .select(attendanceFields)
        .gte("work_date", from)
        .lte("work_date", to),
      supabase
        .from("delay_notices")
        .select("id, user_id, work_date, eta, reason, message, created_at")
        .eq("work_date", workDate),
    ]);

  let monthAttendance = (attendanceResult.data ?? []) as Attendance[];
  if (attendanceResult.error) {
    const fallback = await supabase
      .from("attendance")
      .select(
        "id, user_id, work_date, clock_in, clock_out, status, status_reason"
      )
      .gte("work_date", from)
      .lte("work_date", to);
    monthAttendance = ((fallback.data ?? []) as Omit<
      Attendance,
      "status_overridden" | "auto_clocked_out"
    >[]).map((row) => ({
      ...row,
      status_overridden: false,
      auto_clocked_out: false,
    })) as Attendance[];
  }

  const employeeIds = new Set(
    ((people ?? []) as Profile[])
      .filter((person) => person.role === "employee")
      .map((person) => person.id)
  );
  const dayAttendance = monthAttendance.filter(
    (row) => row.work_date === workDate
  );
  const presence = presenceByDate(monthAttendance, employeeIds);

  return (
    <main>
      <AdminToday
        people={(people ?? []) as Profile[]}
        attendance={dayAttendance}
        delays={(delays ?? []) as DelayNotice[]}
        workDate={workDate}
        presence={presence}
      />
    </main>
  );
}

function presenceByDate(
  rows: Attendance[],
  employeeIds: Set<string>
): Record<string, DayPresence> {
  const byDate: Record<string, DayPresence> = {};

  for (const row of rows) {
    if (!employeeIds.has(row.user_id) || !row.clock_in) continue;
    const current = byDate[row.work_date] ?? { clocked: 0, halfDay: 0 };
    current.clocked += 1;
    if (row.clock_out && row.status === "Half day") {
      current.halfDay += 1;
    }
    byDate[row.work_date] = current;
  }

  return byDate;
}
