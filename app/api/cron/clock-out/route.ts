import { closeOpenAttendance } from "@/lib/close-open-attendance";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const fromVercel = request.headers.get("x-vercel-cron") === "1";
  const authorized =
    fromVercel ||
    (secret ? auth === `Bearer ${secret}` : process.env.NODE_ENV !== "production");

  if (!authorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await closeOpenAttendance();
  return Response.json({ ok: true });
}
