import { closeOpenAttendance } from "@/lib/close-open-attendance";
import { cronAuthorized } from "@/lib/cron-auth";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await closeOpenAttendance();
  return Response.json({ ok: true });
}
