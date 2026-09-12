import { createAdminClient } from "@/lib/supabase/admin";

export async function closeOpenAttendance() {
  try {
    const admin = createAdminClient();
    await admin.rpc("close_open_attendance");
  } catch {
    // SQL not applied yet, missing service role, or no open days.
  }
}
