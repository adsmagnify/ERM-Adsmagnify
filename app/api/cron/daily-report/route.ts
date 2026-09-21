import { cronAuthorized } from "@/lib/cron-auth";
import { sendDailyDayReport } from "@/lib/daily-report";
import { todayIstDate } from "@/lib/time";
import { isWeeklyOff, weeklyOffReason } from "@/lib/workdays";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workDate = todayIstDate();
  if (isWeeklyOff(workDate)) {
    return Response.json({ ok: true, skipped: weeklyOffReason(workDate) });
  }

  const result = await sendDailyDayReport(workDate);
  if (result.error) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ ok: true, workDate });
}
