import Link from "next/link";
import { dayDisplayStatus } from "@/lib/attendance-display";
import type { Attendance, DelayNotice } from "@/lib/database.types";
import { ClockButtons } from "@/components/clock-buttons";
import { LiveClock } from "@/components/live-clock";
import { StatusPill } from "@/components/status-pill";
import {
  clockRuleCopy,
  DEFAULT_SCHEDULE,
  type WorkSchedule,
} from "@/lib/schedule";
import {
  formatIstDate,
  formatIstTime,
  formatWorkedHours,
  recentDateRange,
  todayIstDate,
} from "@/lib/time";

type ClockScreenProps = {
  today: Attendance | null;
  recent: Attendance[];
  schedule?: WorkSchedule;
  delayNotice?: DelayNotice | null;
};

function displayStatus(
  today: Attendance | null,
  schedule: WorkSchedule,
  delayNotice?: DelayNotice | null
) {
  if (!today?.clock_in && delayNotice) {
    return {
      status: "Not started" as const,
      reason: `Delay sent. Clock in by ${formatIstTime(delayNotice.eta)} for a full day.`,
    };
  }
  const { status, reason } = dayDisplayStatus(today, schedule);
  if (status === "Not started") {
    return { status, reason: "Clock in to start your day." };
  }
  return { status, reason };
}

export function ClockScreen({
  today,
  recent,
  schedule = DEFAULT_SCHEDULE,
  delayNotice = null,
}: ClockScreenProps) {
  const { status, reason } = displayStatus(today, schedule, delayNotice);
  const byDate = new Map(recent.map((row) => [row.work_date, row]));
  const days = recentDateRange(8);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-6 pb-20 pt-10 sm:px-10 lg:px-12">
      <LiveClock />

      <StatusPill status={status} reason={reason} />

      <div className="flex flex-col gap-4">
        <ClockButtons
          clockedIn={Boolean(today?.clock_in)}
          clockedOut={Boolean(today?.clock_out)}
          inTime={today?.clock_in ? formatIstTime(today.clock_in) : "Not yet"}
          outTime={
            today?.clock_out
              ? `${formatIstTime(today.clock_out)}${today.auto_clocked_out ? " (auto)" : ""}`
              : "Not yet"
          }
        />
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          {clockRuleCopy(schedule, todayIstDate())}
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Clock in and out from the Churchgate office. If the internet address
          changes, clocking in here updates the saved office IP. If you forget
          to clock out, the day closes at 9:00 PM IST.
        </p>
        {!today?.clock_in ? (
          <p className="text-center text-sm text-muted-foreground">
            Running late?{" "}
            <Link
              href="/delay"
              className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              Open Delay
            </Link>
          </p>
        ) : null}
      </div>

      <section className="rounded-[20px] border border-border bg-white px-6 py-6 sm:px-8">
        <h2 className="font-heading text-lg font-semibold">Today</h2>
        <dl className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <SummaryItem label="In time" value={formatIstTime(today?.clock_in ?? null)} />
          <SummaryItem
            label="Out time"
            value={
              today?.clock_out
                ? `${formatIstTime(today.clock_out)}${today.auto_clocked_out ? " (auto)" : ""}`
                : formatIstTime(null)
            }
          />
          <SummaryItem
            label="Worked hours"
            value={formatWorkedHours(today?.clock_in ?? null, today?.clock_out ?? null)}
          />
        </dl>
      </section>

      <section>
        <h2 className="font-heading text-lg font-semibold">Recent days</h2>
        <ul className="mt-5 flex flex-col gap-3">
          {days.map((date) => {
            const row = byDate.get(date);
            return (
              <li
                key={date}
                className="rounded-[20px] border border-border bg-white px-5 py-5 sm:px-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-heading text-base font-medium">
                      {formatIstDate(date)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      In {formatIstTime(row?.clock_in ?? null)}
                      <span className="mx-2 text-border">·</span>
                      Out {formatIstTime(row?.clock_out ?? null)}
                      {row?.auto_clocked_out ? " (auto)" : ""}
                      <span className="mx-2 text-border">·</span>
                      {formatWorkedHours(row?.clock_in ?? null, row?.clock_out ?? null)}
                    </p>
                  </div>
                  <StatusPill
                    className="items-start sm:items-end"
                    status={
                      !row?.clock_in
                        ? "Not started"
                        : !row.clock_out
                          ? "In progress"
                          : ((row.status ?? "Half day") as "Full day" | "Half day")
                    }
                    reason={row?.clock_out ? row.status_reason : null}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-heading mt-1 text-2xl font-medium tracking-tight">
        {value}
      </dd>
    </div>
  );
}
