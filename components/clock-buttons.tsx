"use client";

import { useTransition, type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { clockIn, clockOut } from "@/app/actions/attendance";
import { getCurrentFix } from "@/lib/geolocation";
import { cn } from "@/lib/utils";

type ClockButtonsProps = {
  clockedIn: boolean;
  clockedOut: boolean;
  inTime: string;
  outTime: string;
};

export function ClockButtons({
  clockedIn,
  clockedOut,
  inTime,
  outTime,
}: ClockButtonsProps) {
  const [pending, startTransition] = useTransition();

  function onClockIn() {
    startTransition(async () => {
      try {
        const fix = await getCurrentFix();
        const result = await clockIn(fix);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Clocked in");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not clock in."
        );
      }
    });
  }

  function onClockOut() {
    startTransition(async () => {
      try {
        const fix = await getCurrentFix();
        const result = await clockOut(fix);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Clocked out");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not clock out."
        );
      }
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5">
      <ClockAction
        label="Clock In"
        time={inTime}
        icon={<ArrowDownLeft className="size-7 sm:size-8" strokeWidth={1.75} />}
        tone="in"
        disabled={clockedIn || pending}
        active={!clockedIn}
        onClick={onClockIn}
      />
      <ClockAction
        label="Clock Out"
        time={outTime}
        icon={<ArrowUpRight className="size-7 sm:size-8" strokeWidth={1.75} />}
        tone="out"
        disabled={!clockedIn || clockedOut || pending}
        active={clockedIn && !clockedOut}
        onClick={onClockOut}
      />
    </div>
  );
}

function ClockAction({
  label,
  time,
  icon,
  tone,
  disabled,
  active,
  onClick,
}: {
  label: string;
  time: string;
  icon: ReactNode;
  tone: "in" | "out";
  disabled: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const isIn = tone === "in";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-[10.5rem] cursor-pointer flex-col items-start justify-between rounded-[20px] px-5 py-5 text-left transition-all duration-200 sm:min-h-[12.5rem] sm:px-7 sm:py-6",
        "focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f5f2] focus-visible:outline-none",
        isIn
          ? "bg-[#1f7a5a] text-white focus-visible:ring-[#1f7a5a]/40"
          : "bg-[#b5432f] text-white focus-visible:ring-[#b5432f]/40",
        active && "shadow-sm",
        disabled && "cursor-not-allowed opacity-35 shadow-none"
      )}
    >
      <span className="opacity-90">{icon}</span>
      <span>
        <span className="font-heading block text-2xl font-semibold tracking-tight sm:text-3xl">
          {label}
        </span>
        <span className="mt-2 block text-sm text-white/85 sm:text-base">
          {time}
        </span>
      </span>
    </button>
  );
}
