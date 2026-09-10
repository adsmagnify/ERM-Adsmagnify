import { redirect } from "next/navigation";
import { AdminPeople } from "@/components/admin-people";
import type { Profile } from "@/lib/database.types";
import { requireProfile } from "@/lib/require-profile";

export const dynamic = "force-dynamic";

export default async function AdminPeoplePage() {
  const { supabase, user, isAdmin } = await requireProfile();

  if (!isAdmin) {
    redirect("/");
  }

  const { data: people } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <main>
      <AdminPeople
        people={(people ?? []) as Profile[]}
        currentUserId={user.id}
      />
    </main>
  );
}
