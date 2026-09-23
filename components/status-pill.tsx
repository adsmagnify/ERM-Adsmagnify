import { cn } from "@/lib/utils";

type StatusKind =
  | "Not started"
  | "In progress"
  | "Full day"
  | "Half day"
  | "Off"
  | "Leave";

const styles: Record<StatusKind, string> = {
  "Not started": "bg-muted text-muted-foreground",
  "In progress": "bg-[#e7f3ee] text-[#1f7a5a]",
  "Full day": "bg-[#e7f3ee] text-[#1f7a5a]",
  "Half day": "bg-[#f8ece9] text-[#b5432f]",
  Off: "bg-muted text-muted-foreground",
  Leave: "bg-[#efe8e0] text-[#6b5344]",
};

export function StatusPill({
  status,
  reason,
  className,
}: {
  status: StatusKind;
  reason?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex rounded-full px-4 py-1.5 text-sm font-medium",
          styles[status]
        )}
      >
        {status}
      </span>
      {reason ? (
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          {reason}
        </p>
      ) : null}
    </div>
  );
}
