"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitDelayNotice } from "@/app/actions/delay";
import { Field, fieldInputClass, SubmitButton } from "@/components/form-field";
import type { DelayNotice } from "@/lib/database.types";
import {
  delayComposeUrls,
  DELAY_EMAIL_CC,
  DELAY_EMAIL_TO,
} from "@/lib/delay-email";
import {
  clockInByForDate,
  formatClockTime,
  type WorkSchedule,
} from "@/lib/schedule";
import {
  defaultDelayEta,
  formatIstTime,
  TIMEZONE,
  todayIstDate,
} from "@/lib/time";
import { cn } from "@/lib/utils";

export function DelayNoticeForm({
  schedule,
  employeeName,
  employeeEmail,
  notice,
}: {
  schedule: WorkSchedule;
  employeeName: string;
  employeeEmail: string;
  notice: DelayNotice | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const today = todayIstDate();
  const clockInBy = clockInByForDate(schedule, today);
  const [eta, setEta] = useState(
    notice ? formatTimeInput(notice.eta) : defaultDelayEta(clockInBy)
  );

  function openEmail(reason: string, message: string, etaValue: string) {
    const compose = delayComposeUrls({
      name: employeeName,
      email: employeeEmail,
      workDate: today,
      clockInBy,
      etaLabel: formatClockTime(`${etaValue}:00`),
      reason,
      message,
    });
    const opened = window.open(compose.gmail, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = compose.mailto;
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const reason = String(formData.get("reason") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const etaValue = String(formData.get("eta") ?? "").trim();

    if (!reason || !message || !etaValue) {
      toast.error("Fill in reason, arrival time, and message.");
      return;
    }

    openEmail(reason, message, etaValue);

    startTransition(async () => {
      const result = await submitDelayNotice(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Send the email, then clock in by your ETA.");
    });
  }

  if (notice) {
    return (
      <section className="rounded-[20px] border border-border bg-white p-6 sm:p-8">
        <h2 className="font-heading text-xl font-semibold">Delay sent</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Clock in by {formatIstTime(notice.eta)} IST for a full day. Clock out
          at or after {formatClockTime(schedule.clock_out_after)} as usual.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          <span className="text-foreground">{notice.reason}</span>
          <span className="mx-2 text-border">·</span>
          {notice.message}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          To: {DELAY_EMAIL_TO}
          <br />
          Cc: {DELAY_EMAIL_CC.join(", ")}
        </p>
        <button
          type="button"
          onClick={() =>
            openEmail(
              notice.reason,
              notice.message,
              formatTimeInput(notice.eta)
            )
          }
          className="mt-5 h-12 cursor-pointer rounded-2xl border border-border px-6 text-base font-medium text-foreground transition-colors hover:bg-muted"
        >
          Open email again
        </button>
      </section>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="rounded-[20px] border border-border bg-white p-6 sm:p-8"
    >
      <h2 className="font-heading text-xl font-semibold">Running late?</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        If you will be 5–10 minutes late, send a delay email first. Clock in by
        your ETA and the day stays full, as long as you still leave at{" "}
        {formatClockTime(schedule.clock_out_after)}.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Reason" htmlFor="reason">
          <input
            id="reason"
            name="reason"
            required
            maxLength={120}
            placeholder="Traffic, appointment…"
            className={cn(fieldInputClass)}
          />
        </Field>
        <Field label="Estimated arrival (IST)" htmlFor="eta">
          <input
            id="eta"
            name="eta"
            type="time"
            required
            value={eta}
            onChange={(event) => setEta(event.target.value)}
            className={cn(fieldInputClass)}
          />
        </Field>
      </div>
      <div className="mt-5">
        <Field label="Message" htmlFor="message">
          <textarea
            id="message"
            name="message"
            required
            rows={4}
            maxLength={500}
            placeholder="A short note for accounts."
            className="min-h-[7.5rem] w-full rounded-2xl border border-input bg-transparent px-4 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </Field>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Opens Gmail to {DELAY_EMAIL_TO}, with {DELAY_EMAIL_CC[0]} and{" "}
        {DELAY_EMAIL_CC[1]} on cc. Send that email, then clock in.
      </p>
      <SubmitButton disabled={pending} className="mt-5 w-full sm:w-auto">
        {pending ? "Saving…" : "Send delay email"}
      </SubmitButton>
    </form>
  );
}

function formatTimeInput(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}
