import type { CookieOptionsWithName } from "@supabase/ssr";

/** Keep the session on this computer until Log out. Chrome caps Max-Age at 400 days. */
export const authCookieOptions: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  maxAge: 400 * 24 * 60 * 60,
  secure: process.env.NODE_ENV === "production",
};
