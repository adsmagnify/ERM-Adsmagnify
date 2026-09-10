"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  success?: string;
};

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function authErrorMessage(error: unknown, fallback: string) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (
    /fetch failed|failed to fetch|enotfound|YOUR_PROJECT/i.test(message)
  ) {
    return "Cannot reach Supabase. In .env.local, set NEXT_PUBLIC_SUPABASE_URL to your real project URL from Supabase → Project Settings → Data API, then restart the dev server.";
  }

  return message || fallback;
}

export async function login(
  _prev: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formString(formData, "email");
  const password = formString(formData, "password");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: authErrorMessage(error, error.message) };
  }

  redirect("/");
}

export async function signup(
  _prev: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const fullName = formString(formData, "full_name");
  const email = formString(formData, "email");
  const password = formString(formData, "password");

  if (!fullName || !email || !password) {
    return { error: "Fill in your name, email, and password." };
  }

  if (password.length < 8) {
    return { error: "Use a password with at least 8 characters." };
  }

  let sessionCreated = false;

  try {
    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
      },
    });

    if (error) {
      return { error: authErrorMessage(error, error.message) };
    }

    sessionCreated = Boolean(data.session);
  } catch (error) {
    return { error: authErrorMessage(error, "Could not create the account.") };
  }

  if (sessionCreated) {
    redirect("/");
  }

  return {
    success: "Check your email to confirm your account, then sign in.",
  };
}

export async function requestPasswordReset(
  _prev: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formString(formData, "email");
  if (!email) {
    return { error: "Enter the email for your account." };
  }

  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/forgot-password?reset=1")}`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "If that email is registered, a reset link is on its way.",
  };
}

export async function updatePassword(
  _prev: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const password = formString(formData, "password");
  const confirm = formString(formData, "confirm");

  if (password.length < 8) {
    return { error: "Use a password with at least 8 characters." };
  }

  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
