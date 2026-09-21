"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { sendDailyReport } from "@/app/actions/daily-report";

export function SendDailyReportButton({ workDate }: { workDate: string }) {
  const [pending, startTransition] = useTransition();

  function onSend() {
    startTransition(async () => {
      const result = await sendDailyReport(workDate);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Day report emailed to Vinay and Aloke.");
    });
  }

  return (
    <button
      type="button"
      onClick={onSend}
      disabled={pending}
      title="Emails vinay.h@adsmagnify.in and alokebajpai@gmail.com"
      className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
    >
      {pending ? "Sending…" : "Email day report"}
    </button>
  );
}
