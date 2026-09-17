import { redirect } from "next/navigation";
import { AdminLeaves } from "@/components/admin-leaves";
import type { LeaveRequest, Profile } from "@/lib/database.types";
import { requireProfile } from "@/lib/require-profile";

export const dynamic = "force-dynamic";

export default async function AdminLeavesPage() {
  const { supabase, isAdmin } = await requireProfile();

  if (!isAdmin) {
    redirect("/leaves");
  }

  const [{ data: people }, { data: leaves, error }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, created_at, clock_in_by, clock_out_after, wednesday_clock_in_by"
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("leave_requests")
      .select("id, user_id, kind, from_date, to_date, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  return (
    <main>
      <AdminLeaves
        people={(people ?? []) as Profile[]}
        leaves={error ? [] : ((leaves ?? []) as LeaveRequest[])}
      />
    </main>
  );
}
