import { cn } from "@/lib/utils";
import type { LeaveStatus } from "@/lib/database.types";

const styles: Record<LeaveStatus, string> = {
  Pending: "bg-muted text-muted-foreground",
  Approved: "bg-[#e7f3ee] text-[#1f7a5a]",
  Rejected: "bg-[#f8ece9] text-[#b5432f]",
};

export function LeaveStatusPill({ status }: { status: LeaveStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-4 py-1.5 text-sm font-medium",
        styles[status]
      )}
    >
      {status}
    </span>
  );
}
