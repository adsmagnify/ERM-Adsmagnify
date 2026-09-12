import nodemailer from "nodemailer";
import {
  DELAY_EMAIL_CC,
  DELAY_EMAIL_TO,
  delayEmailBody,
  delayEmailSubject,
  type DelayEmailInput,
} from "@/lib/delay-email";

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.replace(/\s+/g, "");
  const from = process.env.SMTP_FROM?.trim() || user;

  if (!user || !pass || !from) return null;

  return { host, port, user, pass, from };
}

export async function sendDelayEmail(input: DelayEmailInput) {
  const smtp = smtpConfig();

  if (!smtp) {
    return {
      error:
        "Delay email is not set up yet. Add SMTP_USER and SMTP_PASSWORD in .env.local.",
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
      from: `"Adsmagnify Clock" <${smtp.from}>`,
      to: DELAY_EMAIL_TO,
      cc: [...DELAY_EMAIL_CC],
      replyTo: input.email || undefined,
      subject: delayEmailSubject(input),
      text: delayEmailBody(input),
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
