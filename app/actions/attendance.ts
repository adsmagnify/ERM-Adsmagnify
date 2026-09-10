"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth-user";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string };

export async function clockIn(): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return { error: "You need to be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role === "admin") {
    return { error: "Admins do not clock in." };
  }

  const { error } = await supabase.rpc("clock_in");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

export async function clockOut(): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return { error: "You need to be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role === "admin") {
    return { error: "Admins do not clock out." };
  }

  const { error } = await supabase.rpc("clock_out");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}
