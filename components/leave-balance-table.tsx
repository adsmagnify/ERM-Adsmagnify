import type { LeaveRequest } from "@/lib/database.types";
import {
  leaveBalance,
  leaveTotalsFromProfile,
  leaveYear,
  type LeaveTotals,
} from "@/lib/leave-balance";

export function LeaveBalanceTable({
  leaves,
  totals,
  title,
  description,
}: {
  leaves: LeaveRequest[];
  totals?: LeaveTotals;
  title?: string;
  description?: string;
}) {
  const year = leaveYear();
  const allotment = totals ?? leaveTotalsFromProfile(null);
  const rows = leaveBalance(leaves, allotment, year);
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
          "Used days update when an admin approves a request. Weekly offs are not counted."}
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
                  {row.kind}
                  <span className="ml-2 text-muted-foreground">({row.short})</span>
                </td>
                <td className="py-3.5 pr-3 text-right tabular-nums text-foreground">
                  {row.total}
                </td>
                <td className="py-3.5 pr-3 text-right tabular-nums text-foreground">
                  {row.used}
                </td>
                <td className="py-3.5 pr-3 text-right tabular-nums text-muted-foreground">
                  {row.pending}
                </td>
                <td className="py-3.5 text-right tabular-nums font-medium text-foreground">
                  {row.remaining}
                </td>
              </tr>
            ))}
            <tr>
              <td className="pt-3.5 pr-3 font-medium text-foreground">All</td>
              <td className="pt-3.5 pr-3 text-right tabular-nums text-foreground">
                {summary.total}
              </td>
              <td className="pt-3.5 pr-3 text-right tabular-nums text-foreground">
                {summary.used}
              </td>
              <td className="pt-3.5 pr-3 text-right tabular-nums text-muted-foreground">
                {summary.pending}
              </td>
              <td className="pt-3.5 text-right tabular-nums font-medium text-foreground">
                {summary.remaining}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
