import { redirect } from "next/navigation";
import { ClockScreen } from "@/components/clock-screen";
import type { Attendance } from "@/lib/database.types";
import { requireProfile } from "@/lib/require-profile";
import { addDays, todayIstDate } from "@/lib/time";

export const dynamic = "force-dynamic";

const attendanceFields =
  "id, user_id, work_date, clock_in, clock_out, status, status_reason" as const;

export default async function ClockPage() {
  const { supabase, user, isAdmin } = await requireProfile();

  if (isAdmin) {
    redirect("/admin");
  }

  const today = todayIstDate();
  const from = addDays(today, -7);

  const { data: rows } = await supabase
    .from("attendance")
    .select(attendanceFields)
    .eq("user_id", user.id)
    .gte("work_date", from)
    .lte("work_date", today)
    .order("work_date", { ascending: false });

  const recent = (rows ?? []) as Attendance[];
  const todayRow = recent.find((row) => row.work_date === today) ?? null;

  return (
    <main>
      <ClockScreen today={todayRow} recent={recent} />
    </main>
  );
}
