"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth-user";
import type { UserRole } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

const roles: UserRole[] = ["admin", "employee"];

export async function setProfileRole(targetUserId: string, role: UserRole) {
  if (!roles.includes(role)) {
    return { error: "Invalid role." };
  }

  const supabase = await createClient();
  const actorId = await getAuthUserId(supabase);

  if (!actorId) {
    return { error: "You need to be signed in." };
  }

  const { data: actor } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", actorId)
    .maybeSingle();

  if (actor?.role !== "admin") {
    return { error: "Only an admin can change roles." };
  }

  if (targetUserId === actorId && role !== "admin") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) <= 1) {
      return { error: "Keep at least one admin." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", targetUserId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/people");
  return {};
}
