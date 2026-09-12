"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setAttendanceStatus } from "@/app/actions/admin-attendance";
import type { DayStatus } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export function AdminDayStatus({
  attendanceId,
  status,
}: {
  attendanceId: string;
  status: DayStatus;
}) {
  const [pending, startTransition] = useTransition();

  function onChange(next: DayStatus) {
    if (next === status) return;
    startTransition(async () => {
      const result = await setAttendanceStatus(attendanceId, next);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Set to ${next}.`);
    });
  }

  return (
    <label className="relative inline-flex lg:justify-end">
      <span className="sr-only">Day status</span>
      <select
        value={status}
        disabled={pending}
        aria-label="Day status"
        onChange={(event) => onChange(event.target.value as DayStatus)}
        className={cn(
          "cursor-pointer appearance-none rounded-full py-1.5 pl-4 pr-8 text-sm font-medium outline-none",
          "focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
          status === "Full day"
            ? "bg-[#e7f3ee] text-[#1f7a5a]"
            : "bg-[#f8ece9] text-[#b5432f]"
        )}
      >
        <option value="Full day">Full day</option>
        <option value="Half day">Half day</option>
      </select>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 right-3 size-0 -translate-y-1/2 border-x-4 border-t-[5px] border-x-transparent",
          status === "Full day" ? "border-t-[#1f7a5a]" : "border-t-[#b5432f]"
        )}
      />
    </label>
  );
}
