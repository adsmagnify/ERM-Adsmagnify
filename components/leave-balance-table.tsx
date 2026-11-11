import type { LeaveRequest } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import {
  countHalfDayLeave,
  LEAVE_KIND_COLORS,
  leaveBalance,
  leaveTotalsFromProfile,
  leaveUsageEntries,
  leaveYear,
  type LeaveAttendanceDay,
  type LeaveTotals,
} from "@/lib/leave-balance";
import { formatIstDate, formatIstDateRange } from "@/lib/time";

function formatUsageLabel(label: string) {
  if (label.includes(" – ")) {
    const [from, to] = label.split(" – ");
    return formatIstDateRange(from, to);
  }
  return formatIstDate(label);
}

function formatDays(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function LeaveBalanceTable({
  leaves,
  totals,
  title,
  description,
  attendance = [],
}: {
  leaves: LeaveRequest[];
  totals?: LeaveTotals;
  title?: string;
  description?: string;
  attendance?: LeaveAttendanceDay[];
}) {
  const year = leaveYear();
  const allotment = totals ?? leaveTotalsFromProfile(null);
  const rows = leaveBalance(
    leaves,
    allotment,
    year,
    countHalfDayLeave(attendance, year)
  );
  const usage = leaveUsageEntries(leaves, attendance, year);
  const summary = rows.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      used: acc.used + row.used,
      pending: acc.pending + row.pending,
      remaining: acc.remaining + row.remaining,
    }),
    { total: 0, used: 0, pending: 0, remaining: 0 }
  );

  return (
    <section className="rounded-[20px] border border-border bg-white px-5 py-6 sm:px-6">
      <h2 className="font-heading text-lg font-semibold">
        {title ?? `Leave balance · ${year}`}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {description ??
          "Used days update when an admin approves a request. Half days count as 0.5 casual leave. Weekly offs are not counted."}
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[28rem] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="pb-3 pr-3 font-normal">Type</th>
              <th className="pb-3 pr-3 text-right font-normal">Total</th>
              <th className="pb-3 pr-3 text-right font-normal">Used</th>
              <th className="pb-3 pr-3 text-right font-normal">Pending</th>
              <th className="pb-3 text-right font-normal">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.kind}>
                <td className="py-3.5 pr-3 font-medium text-foreground">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-sm font-medium",
                      LEAVE_KIND_COLORS[row.kind].className
                    )}
                  >
                    {row.kind}
                    <span className="ml-1.5 opacity-80">({row.short})</span>
                  </span>
                </td>
                <td className="py-3.5 pr-3 text-right tabular-nums text-foreground">
                  {row.total}
                </td>
                <td className="py-3.5 pr-3 text-right tabular-nums text-foreground">
                  {formatDays(row.used)}
                </td>
                <td className="py-3.5 pr-3 text-right tabular-nums text-muted-foreground">
                  {formatDays(row.pending)}
                </td>
                <td className="py-3.5 text-right tabular-nums font-medium text-foreground">
                  {formatDays(row.remaining)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="pt-3.5 pr-3 font-medium text-foreground">All</td>
              <td className="pt-3.5 pr-3 text-right tabular-nums text-foreground">
                {formatDays(summary.total)}
              </td>
              <td className="pt-3.5 pr-3 text-right tabular-nums text-foreground">
                {formatDays(summary.used)}
              </td>
              <td className="pt-3.5 pr-3 text-right tabular-nums text-muted-foreground">
                {formatDays(summary.pending)}
              </td>
              <td className="pt-3.5 text-right tabular-nums font-medium text-foreground">
                {formatDays(summary.remaining)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h3 className="font-heading text-base font-semibold">Where it came from</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Each approved leave and each half day that counted toward the balance.
        </p>

        {usage.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-border px-4 py-5 text-sm text-muted-foreground">
            No used or pending leave days yet this year.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-2xl border border-border">
            {usage.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        LEAVE_KIND_COLORS[entry.kind].className
                      )}
                    >
                      {entry.kind}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {formatUsageLabel(entry.label)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {entry.detail}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      entry.state === "Used"
                        ? "bg-[#efe8e0] text-[#6b5344]"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {entry.state}
                  </span>
                  <span className="tabular-nums font-medium text-foreground">
                    {formatDays(entry.days)} day{entry.days === 1 ? "" : "s"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
