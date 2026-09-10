function trimEnv(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

function normalizeSupabaseUrl(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
  }
}

export function getSupabaseEnv() {
  const rawUrl = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = trimEnv(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!rawUrl || !key || rawUrl.includes("YOUR_PROJECT")) {
    return null;
  }

  return { url: normalizeSupabaseUrl(rawUrl), key };
}

export function requireSupabaseEnv() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)."
    );
  }

  if (
    env.url.includes("YOUR_PROJECT") ||
    !env.url.startsWith("https://") ||
    !env.url.includes(".supabase.co")
  ) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL to your real project URL from Supabase → Project Settings → Data API (it looks like https://xxxxxxxx.supabase.co)."
    );
  }

  return env;
}

export function requireServiceRoleKey() {
  const key = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const publicKey = trimEnv(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add the service_role secret from Supabase → Project Settings → API to .env.local (not the anon key)."
    );
  }

  if (publicKey && key === publicKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is the same as the public anon key. Use the service_role secret instead."
    );
  }

  return key;
}
