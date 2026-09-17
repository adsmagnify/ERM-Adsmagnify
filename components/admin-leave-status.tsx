"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setLeaveStatus } from "@/app/actions/admin-leave";
import type { LeaveStatus } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export function AdminLeaveStatus({
  leaveId,
  status,
}: {
  leaveId: string;
  status: LeaveStatus;
}) {
  const [pending, startTransition] = useTransition();

  function onChange(next: LeaveStatus) {
    if (next === status) return;
    startTransition(async () => {
      const result = await setLeaveStatus(leaveId, next);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Set to ${next}.`);
    });
  }

  return (
    <label className="relative inline-flex">
      <span className="sr-only">Leave status</span>
      <select
        value={status}
        disabled={pending}
        aria-label="Leave status"
        onChange={(event) => onChange(event.target.value as LeaveStatus)}
        className={cn(
          "cursor-pointer appearance-none rounded-full py-1.5 pl-4 pr-8 text-sm font-medium outline-none",
          "focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
          status === "Approved"
            ? "bg-[#e7f3ee] text-[#1f7a5a]"
            : status === "Rejected"
              ? "bg-[#f8ece9] text-[#b5432f]"
              : "bg-muted text-muted-foreground"
        )}
      >
        <option value="Pending">Pending</option>
        <option value="Approved">Approved</option>
        <option value="Rejected">Rejected</option>
      </select>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 right-3 size-0 -translate-y-1/2 border-x-4 border-t-[5px] border-x-transparent",
          status === "Approved"
            ? "border-t-[#1f7a5a]"
            : status === "Rejected"
              ? "border-t-[#b5432f]"
              : "border-t-muted-foreground"
        )}
      />
    </label>
  );
}
