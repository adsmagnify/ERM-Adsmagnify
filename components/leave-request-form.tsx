"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { requestLeave } from "@/app/actions/leave";
import { Field, fieldInputClass, SubmitButton } from "@/components/form-field";
import type { LeaveKind } from "@/lib/database.types";
import { todayIstDate } from "@/lib/time";
import { cn } from "@/lib/utils";

const kinds: LeaveKind[] = ["Casual", "Sick"];

export function LeaveRequestForm() {
  const [pending, startTransition] = useTransition();
  const today = todayIstDate();
  const [kind, setKind] = useState<LeaveKind>("Casual");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const reason = String(formData.get("reason") ?? "").trim();

    if (!reason) {
      toast.error("Add a reason.");
      return;
    }

    startTransition(async () => {
      const result = await requestLeave(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      form.reset();
      setKind("Casual");
      setFromDate(today);
      setToDate(today);
      toast.success("Leave request sent.");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[20px] border border-border bg-white p-6 sm:p-8"
    >
      <h2 className="font-heading text-xl font-semibold">Request leave</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Casual or sick. An admin will approve or reject it.
      </p>

      <fieldset className="mt-6">
        <legend className="text-sm text-muted-foreground">Type</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {kinds.map((option) => (
            <label
              key={option}
              className={cn(
                "flex h-12 cursor-pointer items-center justify-center rounded-2xl text-base font-medium transition-colors",
                kind === option
                  ? "bg-foreground text-white"
                  : "border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <input
                type="radio"
                name="kind"
                value={option}
                checked={kind === option}
                onChange={() => setKind(option)}
                className="sr-only"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="From" htmlFor="from_date">
          <input
            id="from_date"
            name="from_date"
            type="date"
            required
            min={today}
            value={fromDate}
            onChange={(event) => {
              const next = event.target.value;
              setFromDate(next);
              if (toDate < next) setToDate(next);
            }}
            className={fieldInputClass}
          />
        </Field>
        <Field label="To" htmlFor="to_date">
          <input
            id="to_date"
            name="to_date"
            type="date"
            required
            min={fromDate}
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className={fieldInputClass}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Reason" htmlFor="reason">
          <textarea
            id="reason"
            name="reason"
            required
            rows={4}
            maxLength={500}
            placeholder="A short note for your manager."
            className="min-h-[7.5rem] w-full rounded-2xl border border-input bg-transparent px-4 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </Field>
      </div>

      <SubmitButton disabled={pending} className="mt-5 w-full sm:w-auto">
        {pending ? "Sending…" : "Send request"}
      </SubmitButton>
    </form>
  );
}
