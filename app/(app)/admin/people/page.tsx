import { redirect } from "next/navigation";
import { AdminPeople } from "@/components/admin-people";
import type { Profile } from "@/lib/database.types";
import { getClientPublicIp, loadOfficeSettings } from "@/lib/office-server";
import { requireProfile } from "@/lib/require-profile";

export const dynamic = "force-dynamic";

export default async function AdminPeoplePage() {
  const { supabase, user, isAdmin } = await requireProfile();

  if (!isAdmin) {
    redirect("/");
  }

  const [{ data: people }, office, currentIp] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, created_at, clock_in_by, clock_out_after, wednesday_clock_in_by"
      )
      .order("created_at", { ascending: true }),
    loadOfficeSettings(supabase),
    getClientPublicIp(),
  ]);

  return (
    <main>
      <AdminPeople
        people={(people ?? []) as Profile[]}
        currentUserId={user.id}
        office={office}
        currentIp={currentIp}
      />
    </main>
  );
}
