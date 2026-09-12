import { redirect } from "next/navigation";
import { AdminDelays } from "@/components/admin-delays";
import type { DelayNotice, Profile } from "@/lib/database.types";
import { requireProfile } from "@/lib/require-profile";
import { todayIstDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminDelaysPage() {
  const { supabase, isAdmin } = await requireProfile();

  if (!isAdmin) {
    redirect("/delay");
  }

  const today = todayIstDate();

  const [{ data: people }, { data: delays }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, created_at, clock_in_by, clock_out_after, wednesday_clock_in_by"
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("delay_notices")
      .select("id, user_id, work_date, eta, reason, message, created_at")
      .eq("work_date", today)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main>
      <AdminDelays
        people={(people ?? []) as Profile[]}
        delays={(delays ?? []) as DelayNotice[]}
      />
    </main>
  );
}
