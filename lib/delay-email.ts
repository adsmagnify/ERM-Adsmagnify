import { formatClockTime } from "@/lib/schedule";
import { formatIstDate } from "@/lib/time";

export const DELAY_EMAIL_TO = "accounts@adsmagnify.in";
export const DELAY_EMAIL_CC = [
  "vinay.h@adsmagnify.in",
  "alokebajpai@gmail.com",
] as const;

export type DelayEmailInput = {
  name: string;
  email: string;
  workDate: string;
  clockInBy: string;
  etaLabel: string;
  reason: string;
  message: string;
};

export function delayEmailSubject(input: DelayEmailInput) {
  return `Delay notice – ${input.name} – ${formatIstDate(input.workDate)}`;
}

export function delayEmailBody(input: DelayEmailInput) {
  return [
    "Hello,",
    "",
    "I will be late today.",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Date: ${formatIstDate(input.workDate, { weekday: "long", month: "long" })}`,
    `Usual clock-in: ${formatClockTime(input.clockInBy)} IST`,
    `ETA: ${input.etaLabel} IST`,
    `Reason: ${input.reason}`,
    "",
    "Message:",
    input.message,
    "",
    "—",
    "Sent from Adsmagnify Clock",
  ].join("\n");
}

export function delayComposeUrls(input: DelayEmailInput) {
  const subject = delayEmailSubject(input);
  const body = delayEmailBody(input);
  const cc = DELAY_EMAIL_CC.join(",");
  const gmail = new URL("https://mail.google.com/mail/");
  gmail.searchParams.set("view", "cm");
  gmail.searchParams.set("fs", "1");
  gmail.searchParams.set("to", DELAY_EMAIL_TO);
  gmail.searchParams.set("cc", cc);
  gmail.searchParams.set("su", subject);
  gmail.searchParams.set("body", body);

  const mailto = `mailto:${DELAY_EMAIL_TO}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { gmail: gmail.toString(), mailto };
}
