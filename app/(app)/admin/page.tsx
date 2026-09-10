import { redirect } from "next/navigation";
import { AdminToday } from "@/components/admin-today";
import type { Attendance, Profile } from "@/lib/database.types";
import { requireProfile } from "@/lib/require-profile";
import { todayIstDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { supabase, isAdmin } = await requireProfile();

  if (!isAdmin) {
    redirect("/");
  }

  const today = todayIstDate();

  const [{ data: people }, { data: attendance }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("attendance")
      .select(
        "id, user_id, work_date, clock_in, clock_out, status, status_reason"
      )
      .eq("work_date", today),
  ]);

  return (
    <main>
      <AdminToday
        people={(people ?? []) as Profile[]}
        attendance={(attendance ?? []) as Attendance[]}
      />
    </main>
  );
}
