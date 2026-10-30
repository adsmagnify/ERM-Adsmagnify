import type { LeaveKind, LeaveRequest } from "@/lib/database.types";
import { addDays, todayIstDate } from "@/lib/time";
import { isOffDay } from "@/lib/workdays";

export const LEAVE_KINDS: LeaveKind[] = ["Casual", "Sick", "Comp Off"];

export const LEAVE_KIND_SHORT: Record<LeaveKind, string> = {
  Casual: "CL",
  Sick: "SL",
  "Comp Off": "CO",
};

export const LEAVE_KIND_COLORS: Record<
  LeaveKind,
  { fill: string; font: string; className: string }
> = {
  Casual: {
    fill: "FFE7F3EE",
    font: "FF1F7A5A",
    className: "bg-[#e7f3ee] text-[#1f7a5a]",
  },
  Sick: {
    fill: "FFF8ECE9",
    font: "FFB5432F",
    className: "bg-[#f8ece9] text-[#b5432f]",
  },
  "Comp Off": {
    fill: "FFECE8F3",
    font: "FF5B4A7A",
    className: "bg-[#ece8f3] text-[#5b4a7a]",
  },
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

/** Working days in a date range, skipping weekly offs and company holidays. */
export function workingDaysBetween(fromDate: string, toDate: string) {
  if (toDate < fromDate) return 0;

  let count = 0;
  let cursor = fromDate;
  while (cursor <= toDate) {
    if (!isOffDay(cursor)) count += 1;
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

/** Each attendance half day counts as 0.5 casual leave. */
export function countHalfDayLeave(
  attendance: { work_date: string; status: string | null }[],
  year = leaveYear()
) {
  const prefix = `${year}-`;
  return (
    attendance.filter(
      (row) => row.status === "Half day" && row.work_date.startsWith(prefix)
    ).length * 0.5
  );
}

export function leaveBalance(
  leaves: LeaveRequest[],
  totals: LeaveTotals = EMPTY_LEAVE_TOTALS,
  year = leaveYear(),
  halfDaysAsCasual = 0
): LeaveBalanceRow[] {
  return LEAVE_KINDS.map((kind) => {
    const forKind = leaves.filter((row) => row.kind === kind);
    const used =
      forKind
        .filter((row) => row.status === "Approved")
        .reduce(
          (sum, row) => sum + daysInYear(row.from_date, row.to_date, year),
          0
        ) + (kind === "Casual" ? halfDaysAsCasual : 0);
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
