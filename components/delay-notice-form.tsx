"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitDelayNotice } from "@/app/actions/delay";
import { Field, fieldInputClass, SubmitButton } from "@/components/form-field";
import type { DelayNotice } from "@/lib/database.types";
import { DELAY_EMAIL_CC, DELAY_EMAIL_TO } from "@/lib/delay-email";
import {
  clockInByForDate,
  formatClockTime,
  type WorkSchedule,
} from "@/lib/schedule";
import {
  defaultDelayEta,
  formatIstTime24,
  TIMEZONE,
  todayIstDate,
} from "@/lib/time";
import { cn } from "@/lib/utils";

const MINUTES = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, "0")
);

export function DelayNoticeForm({
  schedule,
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
  const initialEta = notice
    ? formatTimeInput(notice.eta)
    : defaultDelayEta(clockInBy);
  const [hour, setHour] = useState(initialEta.slice(0, 2));
  const [minute, setMinute] = useState(snapMinute(initialEta.slice(3, 5)));
  const eta = `${hour}:${minute}`;
  const hours = useMemo(() => delayHours(clockInBy), [clockInBy]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("eta", eta);
    const reason = String(formData.get("reason") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    if (!reason || !message || !eta) {
      toast.error("Fill in reason, arrival time, and message.");
      return;
    }

    startTransition(async () => {
      const result = await submitDelayNotice(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Delay email sent. Clock in by your ETA.");
    });
  }

  if (notice) {
    return (
      <section className="rounded-[20px] border border-border bg-white p-6 sm:p-8">
        <h2 className="font-heading text-xl font-semibold">Delay sent</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Clock in by {formatIstTime24(notice.eta)} IST for a full day. Clock out
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
        {formatClockTime(schedule.clock_out_after)}. Use 24-hour time, for
        example 14:30.
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
        <fieldset>
          <legend className="text-sm text-muted-foreground">
            Estimated arrival (24-hour IST)
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="sr-only" htmlFor="eta-hour">
              Hour
            </label>
            <select
              id="eta-hour"
              value={hour}
              onChange={(event) => setHour(event.target.value)}
              className={fieldInputClass}
            >
              {hours.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="eta-minute">
              Minute
            </label>
            <select
              id="eta-minute"
              value={minute}
              onChange={(event) => setMinute(event.target.value)}
              className={fieldInputClass}
            >
              {minuteOptions(minute).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
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
        Emails {DELAY_EMAIL_TO}, with {DELAY_EMAIL_CC.join(", ")} on cc.
      </p>
      <SubmitButton disabled={pending} className="mt-5 w-full sm:w-auto">
        {pending ? "Sending…" : "Send delay email"}
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

function snapMinute(value: string) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "00";
  const snapped = Math.round(numeric / 5) * 5;
  return String(Math.min(55, snapped)).padStart(2, "0");
}

function minuteOptions(current: string) {
  if (MINUTES.includes(current)) return MINUTES;
  return [...MINUTES, current].sort();
}

function delayHours(clockInBy: string) {
  const start = Number(clockInBy.slice(0, 2));
  const from = Number.isNaN(start) ? 10 : start;
  return Array.from({ length: 23 - from + 1 }, (_, index) =>
    String(from + index).padStart(2, "0")
  );
}
