import { redirect } from "next/navigation";
import { DelayNoticeForm } from "@/components/delay-notice-form";
import type { Attendance, DelayNotice } from "@/lib/database.types";
import { requireProfile } from "@/lib/require-profile";
import { scheduleFromProfile } from "@/lib/schedule";
import { formatIstDate, formatIstTime, todayIstDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function DelayPage() {
  const { supabase, user, isAdmin, profile } = await requireProfile();

  if (isAdmin) {
    redirect("/admin/delays");
  }

  const today = todayIstDate();

  const [{ data: todayRow }, { data: delayRow }, { data: recentRows }] =
    await Promise.all([
      supabase
        .from("attendance")
        .select("clock_in")
        .eq("user_id", user.id)
        .eq("work_date", today)
        .maybeSingle(),
      supabase
        .from("delay_notices")
        .select("id, user_id, work_date, eta, reason, message, created_at")
        .eq("user_id", user.id)
        .eq("work_date", today)
        .maybeSingle(),
      supabase
        .from("delay_notices")
        .select("id, user_id, work_date, eta, reason, message, created_at")
        .eq("user_id", user.id)
        .order("work_date", { ascending: false })
        .limit(8),
    ]);

  const clockedIn = Boolean((todayRow as Attendance | null)?.clock_in);
  const todayNotice = (delayRow as DelayNotice | null) ?? null;
  const recent = ((recentRows ?? []) as DelayNotice[]).filter(
    (row) => row.work_date !== today
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 pb-20 pt-10 sm:px-10 lg:px-12">
      {clockedIn && !todayNotice ? (
        <section className="rounded-[20px] border border-border bg-white p-6 sm:p-8">
          <h2 className="font-heading text-xl font-semibold">Already in</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You clocked in today, so a delay email is not needed.
          </p>
        </section>
      ) : (
        <DelayNoticeForm
          schedule={scheduleFromProfile(profile)}
          employeeName={
            profile?.full_name?.trim() || profile?.email || "Employee"
          }
          employeeEmail={profile?.email ?? user.email ?? ""}
          notice={todayNotice}
        />
      )}

      {recent.length > 0 ? (
        <section>
          <h2 className="font-heading text-lg font-semibold">Recent delays</h2>
          <ul className="mt-5 flex flex-col gap-3">
            {recent.map((row) => (
              <li
                key={row.id}
                className="rounded-[20px] border border-border bg-white px-5 py-5 sm:px-6"
              >
                <p className="font-heading text-base font-medium">
                  {formatIstDate(row.work_date)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  ETA {formatIstTime(row.eta)}
                  <span className="mx-2 text-border">·</span>
                  {row.reason}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {row.message}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
