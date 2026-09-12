export type OfficeSettings = {
  id: number;
  label: string;
  address: string;
  lat: number;
  lng: number;
  radius_m: number;
  allowed_ips: string[];
};

export type GeoFix = {
  lat: number;
  lng: number;
  accuracy: number;
};

const EARTH_M = 6_371_000;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function parseGeoFix(input: {
  lat?: number;
  lng?: number;
  accuracy?: number;
}): GeoFix | null {
  const { lat, lng, accuracy } = input;
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(accuracy) ||
    lat === undefined ||
    lng === undefined ||
    accuracy === undefined
  ) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || accuracy < 0) {
    return null;
  }
  return { lat, lng, accuracy };
}

export function normalizeIp(value: string | null | undefined) {
  if (!value) return null;
  let ip = value.trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1") return "127.0.0.1";
  const withoutPort = ip.includes(".") ? ip.replace(/:\d+$/, "") : ip;
  return withoutPort.replace(/^\[([^\]]+)\](?::\d+)?$/, "$1") || null;
}

export function isLoopbackIp(ip: string) {
  return ip === "127.0.0.1" || ip === "::1" || ip.startsWith("127.");
}

export function isPublicIp(ip: string | null | undefined) {
  const value = normalizeIp(ip);
  if (!value) return false;
  if (isLoopbackIp(value)) return false;
  if (value.includes(":")) {
    const lower = value.toLowerCase();
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) {
      return false;
    }
    return true;
  }
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  if (a === 10) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  return true;
}

export function ipMatches(ip: string, allowed: string[]) {
  const normalized = normalizeIp(ip);
  if (!normalized) return false;
  return allowed.some((item) => normalizeIp(item) === normalized);
}

export function parseAllowedIps(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .replace(/[{}]/g, "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}
