import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { dayDisplayStatus } from "@/lib/attendance-display";
import type { Attendance, Profile } from "@/lib/database.types";
import {
  formatIstDate,
  formatIstTime,
  formatWorkedHours,
  todayIstDate,
} from "@/lib/time";

type AdminTodayProps = {
  people: Profile[];
  attendance: Attendance[];
};

const statusRank = {
  "In progress": 0,
  "Full day": 1,
  "Half day": 2,
  "Not started": 3,
} as const;

function hoursLabel(row: Attendance | null) {
  if (!row?.clock_in) return "—";
  if (row.clock_out) {
    return formatWorkedHours(row.clock_in, row.clock_out);
  }
  return `${formatWorkedHours(row.clock_in, new Date().toISOString())} so far`;
}

export function AdminToday({ people, attendance }: AdminTodayProps) {
  const today = todayIstDate();
  const employees = people.filter((person) => person.role === "employee");

  const rows = employees
    .map((person) => {
      const attendanceRow =
        attendance.find(
          (item) => item.user_id === person.id && item.work_date === today
        ) ?? null;
      const display = dayDisplayStatus(attendanceRow);
      return {
        person,
        attendance: attendanceRow,
        name: person.full_name?.trim() || person.email || "Employee",
        ...display,
      };
    })
    .sort((a, b) => {
      const rank = statusRank[a.status] - statusRank[b.status];
      if (rank !== 0) return rank;
      return a.name.localeCompare(b.name);
    });

  const counts = {
    inOffice: rows.filter((row) => row.status === "In progress").length,
    notStarted: rows.filter((row) => row.status === "Not started").length,
    fullDay: rows.filter((row) => row.status === "Full day").length,
    halfDay: rows.filter((row) => row.status === "Half day").length,
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-20 pt-10 sm:px-10 lg:px-12">
      <section>
        <p className="text-sm text-muted-foreground">
          {formatIstDate(today, { weekday: "long", month: "long" })}
        </p>
        <h2 className="font-heading mt-1 text-xl font-medium">Team today</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Who is in, who has left, and the day status.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="In office" value={counts.inOffice} />
        <Stat label="Not in yet" value={counts.notStarted} />
        <Stat label="Full day" value={counts.fullDay} />
        <Stat label="Half day" value={counts.halfDay} tone="warn" />
      </section>

      {rows.length === 0 ? (
        <p className="rounded-[20px] border border-border bg-white px-6 py-10 text-sm text-muted-foreground">
          No employees yet.{" "}
          <Link
            href="/admin/people"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Create a login
          </Link>{" "}
          to see attendance here.
        </p>
      ) : (
        <section className="overflow-hidden rounded-[20px] border border-border bg-white">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_5.5rem_5.5rem_6.5rem_auto] gap-4 border-b border-border px-6 py-3 text-sm text-muted-foreground lg:grid">
            <span>Name</span>
            <span>In</span>
            <span>Out</span>
            <span>Hours</span>
            <span className="text-right">Status</span>
          </div>
          <ul>
            {rows.map((row, index) => (
              <li
                key={row.person.id}
                className={
                  index === 0 ? undefined : "border-t border-border"
                }
              >
                <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_5.5rem_5.5rem_6.5rem_auto] lg:items-center lg:gap-4">
                  <div className="min-w-0">
                    <p className="font-heading truncate text-lg font-medium">
                      {row.name}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {row.person.email}
                    </p>
                    {row.status === "Half day" && row.reason ? (
                      <p className="mt-1 text-sm text-[#b5432f]">{row.reason}</p>
                    ) : null}
                  </div>
                  <TimeCell label="In" value={formatIstTime(row.attendance?.clock_in ?? null)} />
                  <TimeCell label="Out" value={formatIstTime(row.attendance?.clock_out ?? null)} />
                  <TimeCell label="Hours" value={hoursLabel(row.attendance)} />
                  <StatusPill
                    className="items-start lg:items-end"
                    status={row.status}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warn";
}) {
  return (
    <div className="rounded-[20px] border border-border bg-white px-5 py-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`font-heading mt-2 text-3xl font-medium tracking-tight ${
          tone === "warn" && value > 0 ? "text-[#b5432f]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TimeCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 lg:block">
      <p className="text-sm text-muted-foreground lg:hidden">{label}</p>
      <p className="text-base tabular-nums text-foreground">{value}</p>
    </div>
  );
}
