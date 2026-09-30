import type { LeaveKind, LeaveRequest } from "@/lib/database.types";
import { addDays, todayIstDate } from "@/lib/time";
import { isWeeklyOff } from "@/lib/workdays";

export const LEAVE_KINDS: LeaveKind[] = ["Casual", "Sick", "Comp Off"];

export const LEAVE_KIND_SHORT: Record<LeaveKind, string> = {
  Casual: "CL",
  Sick: "SL",
  "Comp Off": "CO",
};

export type LeaveTotals = Record<LeaveKind, number>;

export const EMPTY_LEAVE_TOTALS: LeaveTotals = {
  Casual: 0,
  Sick: 0,
  "Comp Off": 0,
};

export type LeaveBalanceRow = {
  kind: LeaveKind;
  short: string;
  total: number;
  used: number;
  pending: number;
  remaining: number;
};

export function leaveYear(isoDate = todayIstDate()) {
  return Number(isoDate.slice(0, 4));
}

export function leaveTotalsFromProfile(profile?: {
  casual_total?: number | null;
  sick_total?: number | null;
  comp_off_total?: number | null;
} | null): LeaveTotals {
  return {
    Casual: Math.max(0, Number(profile?.casual_total ?? 0)),
    Sick: Math.max(0, Number(profile?.sick_total ?? 0)),
    "Comp Off": Math.max(0, Number(profile?.comp_off_total ?? 0)),
  };
}

/** Working days in a date range, skipping weekly offs. */
export function workingDaysBetween(fromDate: string, toDate: string) {
  if (toDate < fromDate) return 0;

  let count = 0;
  let cursor = fromDate;
  while (cursor <= toDate) {
    if (!isWeeklyOff(cursor)) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

function daysInYear(fromDate: string, toDate: string, year: number) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const start = fromDate < yearStart ? yearStart : fromDate;
  const end = toDate > yearEnd ? yearEnd : toDate;
  if (end < start) return 0;
  return workingDaysBetween(start, end);
}

export function leaveBalance(
  leaves: LeaveRequest[],
  totals: LeaveTotals = EMPTY_LEAVE_TOTALS,
  year = leaveYear()
): LeaveBalanceRow[] {
  return LEAVE_KINDS.map((kind) => {
    const forKind = leaves.filter((row) => row.kind === kind);
    const used = forKind
      .filter((row) => row.status === "Approved")
      .reduce(
        (sum, row) => sum + daysInYear(row.from_date, row.to_date, year),
        0
      );
    const pending = forKind
      .filter((row) => row.status === "Pending")
      .reduce(
        (sum, row) => sum + daysInYear(row.from_date, row.to_date, year),
        0
      );
    const total = totals[kind] ?? 0;
    return {
      kind,
      short: LEAVE_KIND_SHORT[kind],
      total,
      used,
      pending,
      remaining: Math.max(0, total - used),
    };
  });
}
