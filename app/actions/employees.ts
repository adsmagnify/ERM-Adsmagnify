"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { scheduleForNewEmployee } from "@/lib/schedule";

export type CreateEmployeeState = {
  error?: string;
  success?: string;
};

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createEmployee(
  _prev: CreateEmployeeState | null,
  formData: FormData
): Promise<CreateEmployeeState> {
  const fullName = formString(formData, "full_name");
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");

  if (!fullName || !email || !password) {
    return { error: "Fill in name, email, and password." };
  }

  if (password.length < 8) {
    return { error: "Use a password with at least 8 characters." };
  }

  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return { error: "You need to be signed in." };
  }

  const { data: actor } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (actor?.role !== "admin") {
    return { error: "Only an admin can create employees." };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error) {
      if (/already been registered/i.test(error.message)) {
        return restoreEmployee(admin, { email, password, fullName });
      }
      return { error: error.message };
    }

    if (!data.user) {
      return { error: "Could not create the employee." };
    }

    const { error: profileError } = await admin.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      email,
      role: "employee",
      ...scheduleForNewEmployee(fullName, email),
    });

    if (profileError) {
      return { error: profileError.message };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/people");
    return {
      success: `${fullName} can now sign in with ${email}.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create the employee.";
    return { error: message };
  }
}

async function restoreEmployee(
  admin: ReturnType<typeof createAdminClient>,
  input: { email: string; password: string; fullName: string }
): Promise<CreateEmployeeState> {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    return { error: error.message };
  }

  const existing = data.users.find(
    (item) => item.email?.toLowerCase() === input.email
  );

  if (!existing) {
    return {
      error:
        "A user with this email address has already been registered. Delete them under Authentication → Users, then try again.",
    };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    existing.id,
    {
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    }
  );

  if (updateError) {
    return { error: updateError.message };
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: existing.id,
    full_name: input.fullName,
    email: input.email,
    role: "employee",
    ...scheduleForNewEmployee(input.fullName, input.email),
  });

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/people");
  return {
    success: `${input.fullName} can now sign in with ${input.email}. The previous login for this email was restored.`,
  };
}

export async function deleteEmployee(targetUserId: string) {
  const supabase = await createClient();
  const actorId = await getAuthUserId(supabase);

  if (!actorId) {
    return { error: "You need to be signed in." };
  }

  if (targetUserId === actorId) {
    return { error: "You cannot delete your own account from here." };
  }

  const { data: actor } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", actorId)
    .maybeSingle();

  if (actor?.role !== "admin") {
    return { error: "Only an admin can delete employees." };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(targetUserId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/people");
    return {};
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete the employee.";
    return { error: message };
  }
}
