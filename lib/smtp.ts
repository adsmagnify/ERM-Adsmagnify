import nodemailer from "nodemailer";
import {
  DELAY_EMAIL_CC,
  DELAY_EMAIL_TO,
  delayEmailBody,
  delayEmailSubject,
  type DelayEmailInput,
} from "@/lib/delay-email";
import {
  LEAVE_EMAIL_CC,
  LEAVE_EMAIL_TO,
  leaveEmailBody,
  leaveEmailSubject,
  type LeaveEmailInput,
} from "@/lib/leave-email";

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.replace(/\s+/g, "");
  const from = process.env.SMTP_FROM?.trim() || user;

  if (!user || !pass || !from) return null;

  return { host, port, user, pass, from };
}

export async function sendMail({
  to,
  cc,
  subject,
  text,
  html,
  fromName,
  replyTo,
}: {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  text: string;
  html?: string;
  fromName?: string;
  replyTo?: string;
}) {
  const smtp = smtpConfig();

  if (!smtp) {
    return {
      error:
        "Email is not set up yet. Add SMTP_USER and SMTP_PASSWORD in .env.local.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    await transporter.sendMail({
      from: `"${fromName || "Adsmagnify Clock"}" <${smtp.from}>`,
      to,
      cc,
      replyTo: replyTo || undefined,
      subject,
      text,
      html,
    });

    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send email.";
    if (/invalid login|username and password|authentication/i.test(message)) {
      return {
        error:
          "Gmail rejected the mailbox login. SMTP_USER must be the Google account that created the app password.",
      };
    }
    return { error: message };
  }
}

export async function sendDelayEmail(input: DelayEmailInput) {
  return sendMail({
    to: DELAY_EMAIL_TO,
    cc: [...DELAY_EMAIL_CC],
    subject: delayEmailSubject(input),
    text: delayEmailBody(input),
    fromName: `${input.name} via Adsmagnify Clock`,
    replyTo: input.email || undefined,
  });
}

export async function sendLeaveEmail(input: LeaveEmailInput) {
  return sendMail({
    to: LEAVE_EMAIL_TO,
    cc: [...LEAVE_EMAIL_CC],
    subject: leaveEmailSubject(input),
    text: leaveEmailBody(input),
    fromName: `${input.name} via Adsmagnify Clock`,
    replyTo: input.email || undefined,
  });
}
