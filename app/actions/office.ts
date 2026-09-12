"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth-user";
import { isPublicIp, ipMatches, normalizeIp } from "@/lib/office";
import {
  assertNearOfficeForSetup,
  getClientPublicIp,
  loadOfficeSettings,
} from "@/lib/office-server";
import { createClient } from "@/lib/supabase/server";

export type OfficeActionResult = { error?: string; success?: string };

export type LocationPayload = {
  lat: number;
  lng: number;
  accuracy: number;
};

async function requireAdmin() {
  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return { error: "You need to be signed in." as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { error: "Only an admin can change the office network." as const };
  }

  return { supabase };
}

export async function registerOfficeIp(
  payload: LocationPayload
): Promise<OfficeActionResult> {
  const ready = await requireAdmin();
  if ("error" in ready) return ready;

  const [office, ip] = await Promise.all([
    loadOfficeSettings(ready.supabase),
    getClientPublicIp(),
  ]);
  const near = assertNearOfficeForSetup(office, payload);

  if (near.error) return { error: near.error };

  const normalized = normalizeIp(ip);
  if (!normalized || !isPublicIp(normalized)) {
    return {
      error:
        "Could not read the office internet address. Stay on ethernet or Wi-Fi and try again.",
    };
  }

  if (!office) {
    return { error: "Office location is not set up yet." };
  }

  if (ipMatches(normalized, office.allowed_ips)) {
    return { success: "This office network is already saved." };
  }

  const nextIps = [...office.allowed_ips, normalized];
  const { error } = await ready.supabase
    .from("office_settings")
    .update({ allowed_ips: nextIps, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) return { error: error.message };

  revalidatePath("/admin/people");
  return { success: `Saved office network (${normalized}).` };
}

export async function removeOfficeIp(ip: string): Promise<OfficeActionResult> {
  const ready = await requireAdmin();
  if ("error" in ready) return ready;

  const office = await loadOfficeSettings(ready.supabase);
  if (!office) {
    return { error: "Office location is not set up yet." };
  }

  const nextIps = office.allowed_ips.filter(
    (item) => normalizeIp(item) !== normalizeIp(ip)
  );

  const { error } = await ready.supabase
    .from("office_settings")
    .update({ allowed_ips: nextIps, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) return { error: error.message };

  revalidatePath("/admin/people");
  return { success: "Removed that office network." };
}
