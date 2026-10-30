import { attendanceWorkbookBuffer } from "@/lib/attendance-export";
import type { Attendance, LeaveRequest, Profile } from "@/lib/database.types";
import { mergeHolidays, type HolidayMap } from "@/lib/holidays";
import { requireProfile } from "@/lib/require-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, endOfMonth, startOfMonth, todayIstDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { isAdmin } = await requireProfile();
  if (!isAdmin) {
    return new Response("Only an admin can export attendance.", { status: 403 });
  }

  const admin = createAdminClient();
  const [
    { data: people, error: peopleError },
    { data: attendance, error: attendanceError },
    { data: leaves, error: leaveError },
    { data: holidayRows, error: holidayError },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, full_name, email, role, created_at, clock_in_by, clock_out_after, wednesday_clock_in_by"
      )
      .eq("role", "employee")
      .order("full_name", { ascending: true }),
    admin
      .from("attendance")
      .select(
        "id, user_id, work_date, clock_in, clock_out, status, status_reason, status_overridden, auto_clocked_out, created_at"
      )
      .order("work_date", { ascending: true }),
    admin
      .from("leave_requests")
      .select("id, user_id, kind, from_date, to_date, reason, status, created_at")
      .in("status", ["Pending", "Approved"]),
    admin.from("holidays").select("work_date, name"),
  ]);

  const firstError = peopleError ?? attendanceError ?? leaveError;
  if (firstError) {
    return Response.json({ error: firstError.message }, { status: 500 });
  }

  const holidays: HolidayMap = mergeHolidays(
    Object.fromEntries(
      ((holidayRows ?? []) as { work_date: string; name: string }[]).map(
        (row) => [row.work_date, row.name]
      )
    )
  );
  if (holidayError && !/schema cache|could not find|holidays/i.test(holidayError.message)) {
    return Response.json({ error: holidayError.message }, { status: 500 });
  }

  const employees = ((people ?? []) as Profile[]).map((person) => ({
    ...person,
    remote_ok: Boolean(person.remote_ok),
    casual_total: Number(person.casual_total ?? 0),
    sick_total: Number(person.sick_total ?? 0),
    comp_off_total: Number(person.comp_off_total ?? 0),
  }));
  const rows = (attendance ?? []) as Attendance[];
  const today = todayIstDate();
  const firstAttendance = rows[0]?.work_date;
  const firstJoined = employees
    .map((person) => person.created_at?.slice(0, 10))
    .filter(Boolean)
    .sort()[0];
  const fromDate = startOfMonth(
    [firstAttendance, firstJoined, today].filter(Boolean).sort()[0] as string
  );
  const toDate = today < endOfMonth(today) ? today : endOfMonth(today);

  const buffer = await attendanceWorkbookBuffer(
    employees,
    rows,
    (leaves ?? []) as LeaveRequest[],
    holidays,
    fromDate,
    addDays(toDate, 0)
  );

  const filename = `Adsmagnify-attendance-${today}.xlsx`;
  return new Response(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
