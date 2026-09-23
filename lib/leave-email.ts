import type { LeaveKind, LeaveStatus } from "@/lib/database.types";
import { formatIstDateRange } from "@/lib/time";

export const LEAVE_EMAIL_TO = "adsmagnify@gmail.com";
export const LEAVE_EMAIL_CC = [
  "vinay.h@adsmagnify.in",
  "accounts@adsmagnify.in",
  "alokebajpai@gmail.com",
] as const;

export type LeaveEmailInput = {
  name: string;
  email: string;
  kind: LeaveKind;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
};

export function leaveEmailSubject(input: LeaveEmailInput) {
  const dates = formatIstDateRange(input.fromDate, input.toDate);
  if (input.status === "Approved") {
    return `Leave approved – ${input.name} – ${dates}`;
  }
  if (input.status === "Rejected") {
    return `Leave rejected – ${input.name} – ${dates}`;
  }
  return `Leave notice – ${input.name} – ${dates}`;
}

export function leaveEmailBody(input: LeaveEmailInput) {
  const dates = formatIstDateRange(input.fromDate, input.toDate);
  const headline =
    input.status === "Approved"
      ? "Leave has been approved."
      : input.status === "Rejected"
        ? "Leave has been rejected."
        : "A leave request has been sent.";

  return [
    "Hello,",
    "",
    headline,
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Type: ${input.kind}`,
    `Dates: ${dates}`,
    `Status: ${input.status}`,
    "",
    "Reason:",
    input.reason,
    "",
    "—",
    "Sent from Adsmagnify Clock",
  ].join("\n");
}
