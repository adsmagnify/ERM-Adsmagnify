import type { Attendance } from "@/lib/database.types";

export type DisplayStatus = "Not started" | "In progress" | "Full day" | "Half day";

export function dayDisplayStatus(row: Attendance | null) {
  if (!row?.clock_in) {
    return {
      status: "Not started" as const,
      reason: null as string | null,
    };
  }

  if (!row.clock_out) {
    return {
      status: "In progress" as const,
      reason: "Clock out after 7:00 PM for a full day",
    };
  }

  return {
    status: (row.status ?? "Half day") as "Full day" | "Half day",
    reason: row.status_reason,
  };
}
