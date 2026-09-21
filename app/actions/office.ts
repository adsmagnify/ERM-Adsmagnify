"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth-user";
import { isPublicIp, ipMatches, normalizeIp, officeIps, withOfficeIp } from "@/lib/office";
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

  if (ipMatches(normalized, officeIps(office))) {
    return { success: "This office network is already saved." };
  }

  return saveOfficeIps(ready.supabase, office, normalized, `Saved office IP (${normalized}).`);
}

export async function setStaticOfficeIp(
  ip: string
): Promise<OfficeActionResult> {
  const ready = await requireAdmin();
  if ("error" in ready) return ready;

  const normalized = normalizeIp(ip);
  if (!normalized || !isPublicIp(normalized)) {
    return { error: "Enter a public IPv4 or IPv6 address." };
  }

  const office = await loadOfficeSettings(ready.supabase);
  if (!office) {
    return { error: "Office location is not set up yet." };
  }

  if (ipMatches(normalized, officeIps(office))) {
    return saveOfficeIps(
      ready.supabase,
      office,
      normalized,
      `Static office IP is ${normalized}.`
    );
  }

  return saveOfficeIps(
    ready.supabase,
    office,
    normalized,
    `Saved static office IP (${normalized}).`
  );
}

export async function removeOfficeIp(ip: string): Promise<OfficeActionResult> {
  const ready = await requireAdmin();
  if ("error" in ready) return ready;

  const office = await loadOfficeSettings(ready.supabase);
  if (!office) {
    return { error: "Office location is not set up yet." };
  }

  const nextIps = officeIps(office).filter(
    (item) => item !== normalizeIp(ip)
  );
  const nextStatic =
    normalizeIp(office.static_ip) === normalizeIp(ip)
      ? (nextIps[0] ?? null)
      : office.static_ip;

  const { error } = await ready.supabase
    .from("office_settings")
    .update({
      static_ip: nextStatic,
      allowed_ips: nextIps,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    if (/static_ip/i.test(error.message)) {
      const fallback = await ready.supabase
        .from("office_settings")
        .update({
          allowed_ips: nextIps,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (fallback.error) return { error: fallback.error.message };
    } else {
      return { error: error.message };
    }
  }

  revalidatePath("/admin/people");
  return { success: "Removed that office IP." };
}

async function saveOfficeIps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  office: NonNullable<Awaited<ReturnType<typeof loadOfficeSettings>>>,
  ip: string,
  success: string
): Promise<OfficeActionResult> {
  const next = withOfficeIp(office, ip);
  const { error } = await supabase
    .from("office_settings")
    .update({
      static_ip: next.static_ip,
      allowed_ips: next.allowed_ips,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    if (/static_ip/i.test(error.message) || /schema cache/i.test(error.message)) {
      const fallback = await supabase
        .from("office_settings")
        .update({
          allowed_ips: next.allowed_ips,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (fallback.error) return { error: fallback.error.message };
    } else {
      return { error: error.message };
    }
  }

  revalidatePath("/admin/people");
  return { success };
}
