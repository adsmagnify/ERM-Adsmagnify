import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  haversineMeters,
  ipMatches,
  isPublicIp,
  normalizeIp,
  parseAllowedIps,
  parseGeoFix,
  type GeoFix,
  type OfficeSettings,
} from "@/lib/office";

type Supabase = SupabaseClient<Database>;

function headerIp(headerList: Headers) {
  const forwarded = headerList.get("x-forwarded-for");
  const firstForwarded = forwarded?.split(",")[0]?.trim() ?? null;
  return normalizeIp(
    headerList.get("cf-connecting-ip") ||
      headerList.get("x-real-ip") ||
      headerList.get("true-client-ip") ||
      headerList.get("x-client-ip") ||
      headerList.get("forwarded")?.match(/for="?\[?([^\]";,]+)/i)?.[1] ||
      firstForwarded
  );
}

async function lookupOutboundPublicIp() {
  const urls = [
    "https://api.ipify.org?format=json",
    "https://api64.ipify.org?format=json",
  ] as const;

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      const body = (await response.json()) as { ip?: string };
      const ip = normalizeIp(body.ip);
      if (ip && isPublicIp(ip)) return ip;
    } catch {
      // Try the next lookup.
    }
  }

  return null;
}

export async function getRequestIp() {
  const headerList = await headers();
  return headerIp(headerList);
}

export async function getClientPublicIp() {
  const requestIp = await getRequestIp();
  if (isPublicIp(requestIp) && requestIp) return requestIp;

  // Localhost / LAN: the browser request looks like 127.0.0.1. Ask the
  // internet what public address this machine is using instead.
  if (process.env.VERCEL === "1") return requestIp;

  return (await lookupOutboundPublicIp()) ?? requestIp;
}

export function presenceBypassEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.OFFICE_ALLOW_REMOTE === "true"
  );
}

export async function loadOfficeSettings(
  supabase: Supabase
): Promise<OfficeSettings | null> {
  const { data } = await supabase
    .from("office_settings")
    .select("id, label, address, lat, lng, radius_m, allowed_ips")
    .eq("id", 1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    label: data.label,
    address: data.address,
    lat: Number(data.lat),
    lng: Number(data.lng),
    radius_m: Number(data.radius_m),
    allowed_ips: parseAllowedIps(data.allowed_ips),
  };
}

export function assertNearOfficeForSetup(
  office: OfficeSettings | null,
  input: { lat?: number; lng?: number; accuracy?: number }
): { error: string | null; fix: GeoFix | null } {
  const fix = parseGeoFix(input);

  if (!fix) {
    return {
      error: "Allow location so we can confirm you are at the office.",
      fix: null,
    };
  }

  if (!office) {
    return { error: "Office location is not set up yet.", fix };
  }

  const distance = haversineMeters(fix.lat, fix.lng, office.lat, office.lng);
  if (distance > Math.max(office.radius_m, 1500)) {
    return {
      error: "Go to the Churchgate office, then save this network.",
      fix,
    };
  }

  return { error: null, fix };
}

export function assertAtOffice(
  office: OfficeSettings | null,
  ip: string | null,
  input: { lat?: number; lng?: number; accuracy?: number }
): { error: string | null; fix: GeoFix | null } {
  const fix = parseGeoFix(input);

  if (presenceBypassEnabled()) {
    return { error: null, fix };
  }

  if (!fix) {
    return {
      error: "Allow location to clock in at the office.",
      fix: null,
    };
  }

  if (!office) {
    return { error: "Office location is not set up yet.", fix };
  }

  if (!office.allowed_ips.length) {
    return {
      error:
        "The office network is not registered yet. Ask an admin to save it from People.",
      fix,
    };
  }

  if (!ip || !isPublicIp(ip) || !ipMatches(ip, office.allowed_ips)) {
    return {
      error: "Connect to the office network (Wi-Fi or ethernet) to clock in or out.",
      fix,
    };
  }

  const distance = haversineMeters(fix.lat, fix.lng, office.lat, office.lng);
  const slack = Math.min(Math.max(fix.accuracy, 0), 120);
  if (distance > office.radius_m + slack) {
    return {
      error: "You need to be at the Churchgate office to clock in or out.",
      fix,
    };
  }

  if (fix.accuracy > 800 && distance > office.radius_m) {
    return {
      error: "Location is too imprecise. Allow precise location, then try again.",
      fix,
    };
  }

  return { error: null, fix };
}
