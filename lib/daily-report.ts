import type {
  Attendance,
  DelayNotice,
  LeaveRequest,
  Profile,
  Task,
  TaskPriority,
  TaskStatus,
} from "@/lib/database.types";
import { closeOpenAttendance } from "@/lib/close-open-attendance";
import { sendMail } from "@/lib/smtp";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatIstDate,
  formatIstTime,
  formatWorkedHours,
  todayIstDate,
} from "@/lib/time";
import { isWeeklyOff, weeklyOffReason } from "@/lib/workdays";

export const DAILY_REPORT_TO = [
  "adsmagnify@gmail.com",
  "vinay.h@adsmagnify.in",
] as const;

export const DAILY_REPORT_CC = ["alokebajpai@gmail.com"] as const;

export type DailyReportStatus =
  | "Full day"
  | "Half day"
  | "In progress"
  | "Leave"
  | "Off";

export type DailyReportTask = {
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
};

export type EmployeeDayReport = {
  name: string;
  email: string;
  status: DailyReportStatus;
  statusNote: string | null;
  clockIn: string | null;
  clockOut: string | null;
  autoClockedOut: boolean;
  hours: string;
  delay: {
    eta: string;
    reason: string;
    message: string;
  } | null;
  leave: {
    kind: string;
    status: string;
    reason: string;
  } | null;
  tasks: DailyReportTask[];
};

const taskStatusOrder: Record<TaskStatus, number> = {
  "To Do": 0,
  "In Progress": 1,
  Done: 2,
};

const taskPriorityOrder: Record<TaskPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

export function dailyReportSubject(workDate: string) {
  return `Daily report – ${formatIstDate(workDate, { weekday: "long", month: "long" })}`;
}

export function buildEmployeeDayReport(
  person: Profile,
  workDate: string,
  attendance: Attendance | null,
  delay: DelayNotice | null,
  leaves: LeaveRequest[],
  tasks: Task[]
): EmployeeDayReport {
  const name = person.full_name?.trim() || person.email || "Employee";
  const email = person.email ?? "";
  const leave = pickLeave(leaves);
  const sortedTasks = [...tasks].sort((a, b) => {
    const status = taskStatusOrder[a.status] - taskStatusOrder[b.status];
    if (status !== 0) return status;
    return taskPriorityOrder[a.priority] - taskPriorityOrder[b.priority];
  });

  if (isWeeklyOff(workDate) && !attendance?.clock_in) {
    return {
      name,
      email,
      status: "Off",
      statusNote: weeklyOffReason(workDate).replace(/\.$/, ""),
      clockIn: null,
      clockOut: null,
      autoClockedOut: false,
      hours: "—",
      delay: delayFields(delay),
      leave: leaveFields(leave),
      tasks: sortedTasks.map(taskFields),
    };
  }

  if (!attendance?.clock_in) {
    return {
      name,
      email,
      status: "Leave",
      statusNote: leave
        ? `${leave.kind} · ${leave.status}`
        : "No clock-in",
      clockIn: null,
      clockOut: null,
      autoClockedOut: false,
      hours: "—",
      delay: delayFields(delay),
      leave: leaveFields(leave),
      tasks: sortedTasks.map(taskFields),
    };
  }

  const status: DailyReportStatus = attendance.clock_out
    ? (attendance.status ?? "Half day")
    : "In progress";

  return {
    name,
    email,
    status,
    statusNote: attendance.clock_out
      ? attendance.status_reason
      : "Still open",
    clockIn: attendance.clock_in,
    clockOut: attendance.clock_out,
    autoClockedOut: Boolean(attendance.auto_clocked_out),
    hours: formatWorkedHours(attendance.clock_in, attendance.clock_out),
    delay: delayFields(delay),
    leave: leaveFields(leave),
    tasks: sortedTasks.map(taskFields),
  };
}

export function dailyReportText(workDate: string, rows: EmployeeDayReport[]) {
  const dateLabel = formatIstDate(workDate, {
    weekday: "long",
    month: "long",
  });
  const lines = [
    "Hello,",
    "",
    `Team day report for ${dateLabel}.`,
    "",
    summaryLine(rows),
    "",
  ];

  for (const row of rows) {
    lines.push("————————");
    lines.push(row.name);
    if (row.email) lines.push(row.email);
    lines.push(`Status: ${statusLine(row)}`);
    lines.push(`In: ${formatIstTime(row.clockIn)}`);
    lines.push(
      `Out: ${formatIstTime(row.clockOut)}${row.autoClockedOut ? " (auto)" : ""}`
    );
    lines.push(`Hours: ${row.hours}`);

    if (row.delay) {
      lines.push(`Delay: ${row.delay.reason}`);
      lines.push(`Delay ETA: ${formatIstTime(row.delay.eta)}`);
      if (row.delay.message) lines.push(`Delay note: ${row.delay.message}`);
    } else {
      lines.push("Delay: none");
    }

    if (row.status === "Leave" && row.leave) {
      lines.push(`Leave: ${row.leave.kind} (${row.leave.status})`);
      if (row.leave.reason) lines.push(`Leave reason: ${row.leave.reason}`);
    }

    lines.push("");
    lines.push("Tasks due today:");
    if (row.tasks.length === 0) {
      lines.push("• none");
    } else {
      for (const task of row.tasks) {
        lines.push(`• ${task.status} · ${task.priority} · ${task.title}`);
      }
    }
    lines.push("");
  }

  lines.push("—");
  lines.push("Sent from Adsmagnify Clock");
  return lines.join("\n");
}

export function dailyReportHtml(workDate: string, rows: EmployeeDayReport[]) {
  const dateLabel = escapeHtml(
    formatIstDate(workDate, { weekday: "long", month: "long" })
  );
  const people = rows
    .map((row) => {
      const tasks =
        row.tasks.length === 0
          ? `<p style="margin:8px 0 0;color:#6b6b6b">No tasks due today.</p>`
          : `<ul style="margin:8px 0 0;padding-left:18px">${row.tasks
              .map(
                (task) =>
                  `<li style="margin:0 0 4px">${escapeHtml(task.status)} · ${escapeHtml(task.priority)} · ${escapeHtml(task.title)}</li>`
              )
              .join("")}</ul>`;

      const delay = row.delay
        ? `<p style="margin:8px 0 0"><strong>Delay:</strong> ${escapeHtml(row.delay.reason)} · ETA ${escapeHtml(formatIstTime(row.delay.eta))}${row.delay.message ? `<br>${escapeHtml(row.delay.message)}` : ""}</p>`
        : `<p style="margin:8px 0 0;color:#6b6b6b">No delay notice.</p>`;

      const leave =
        row.status === "Leave" && row.leave
          ? `<p style="margin:8px 0 0"><strong>Leave:</strong> ${escapeHtml(row.leave.kind)} (${escapeHtml(row.leave.status)})<br>${escapeHtml(row.leave.reason)}</p>`
          : "";

      return `<section style="margin:0 0 28px;padding:0 0 20px;border-bottom:1px solid #e8e4de">
  <h2 style="margin:0;font-size:18px;font-weight:600">${escapeHtml(row.name)}</h2>
  ${row.email ? `<p style="margin:4px 0 0;color:#6b6b6b">${escapeHtml(row.email)}</p>` : ""}
  <p style="margin:12px 0 0"><strong>Status:</strong> ${escapeHtml(statusLine(row))}</p>
  <p style="margin:8px 0 0"><strong>In:</strong> ${escapeHtml(formatIstTime(row.clockIn))} &nbsp; <strong>Out:</strong> ${escapeHtml(formatIstTime(row.clockOut))}${row.autoClockedOut ? " (auto)" : ""} &nbsp; <strong>Hours:</strong> ${escapeHtml(row.hours)}</p>
  ${delay}
  ${leave}
  <p style="margin:16px 0 0;font-weight:600">Tasks due today</p>
  ${tasks}
</section>`;
    })
    .join("\n");

  return `<div style="font-family:Georgia,'Times New Roman',serif;color:#1c1917;line-height:1.5;max-width:640px">
  <p>Hello,</p>
  <p>Team day report for ${dateLabel}.</p>
  <p style="color:#6b6b6b">${escapeHtml(summaryLine(rows))}</p>
  ${people}
  <p style="color:#6b6b6b">Sent from Adsmagnify Clock</p>
</div>`;
}

export async function sendDailyDayReport(workDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    return { error: "Choose a valid date." };
  }

  if (workDate === todayIstDate()) {
    await closeOpenAttendance();
  }

  let rows: EmployeeDayReport[];
  try {
    rows = await loadEmployeeDayReports(workDate);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load the day report.";
    return { error: message };
  }

  if (rows.length === 0) {
    return { error: "No employees to include in the report." };
  }

  return sendMail({
    to: [...DAILY_REPORT_TO],
    cc: [...DAILY_REPORT_CC],
    subject: dailyReportSubject(workDate),
    text: dailyReportText(workDate, rows),
    html: dailyReportHtml(workDate, rows),
    fromName: "Adsmagnify Clock",
  });
}

async function loadEmployeeDayReports(workDate: string) {
  const admin = createAdminClient();
  const [{ data: people, error: peopleError }, { data: attendance, error: attendanceError }, { data: delays, error: delayError }, { data: leaves, error: leaveError }, { data: tasks, error: taskError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, full_name, email, role, created_at, clock_in_by, clock_out_after, wednesday_clock_in_by"
        )
        .eq("role", "employee")
        .order("full_name", { ascending: true }),
      admin
        .from("attendance")
        .select(
          "id, user_id, work_date, clock_in, clock_out, status, status_reason, status_overridden, auto_clocked_out, created_at, clock_in_lat, clock_in_lng, clock_in_accuracy, clock_in_ip, clock_out_lat, clock_out_lng, clock_out_accuracy, clock_out_ip"
        )
        .eq("work_date", workDate),
      admin
        .from("delay_notices")
        .select("id, user_id, work_date, eta, reason, message, created_at")
        .eq("work_date", workDate),
      admin
        .from("leave_requests")
        .select("id, user_id, kind, from_date, to_date, reason, status, created_at")
        .lte("from_date", workDate)
        .gte("to_date", workDate),
      admin
        .from("tasks")
        .select("id, user_id, title, priority, status, due_date, created_at")
        .eq("due_date", workDate),
    ]);

  const firstError =
    peopleError ?? attendanceError ?? delayError ?? leaveError ?? taskError;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const employees = ((people ?? []) as Profile[]).sort((a, b) =>
    (a.full_name?.trim() || a.email || "").localeCompare(
      b.full_name?.trim() || b.email || ""
    )
  );

  return employees.map((person) =>
    buildEmployeeDayReport(
      person,
      workDate,
      ((attendance ?? []) as Attendance[]).find(
        (row) => row.user_id === person.id
      ) ?? null,
      ((delays ?? []) as DelayNotice[]).find(
        (row) => row.user_id === person.id
      ) ?? null,
      ((leaves ?? []) as LeaveRequest[]).filter(
        (row) => row.user_id === person.id
      ),
      ((tasks ?? []) as Task[]).filter((row) => row.user_id === person.id)
    )
  );
}

function pickLeave(leaves: LeaveRequest[]) {
  return (
    leaves.find((row) => row.status === "Approved") ??
    leaves.find((row) => row.status === "Pending") ??
    null
  );
}

function leaveFields(leave: LeaveRequest | null) {
  if (!leave) return null;
  return {
    kind: leave.kind,
    status: leave.status,
    reason: leave.reason,
  };
}

function delayFields(delay: DelayNotice | null) {
  if (!delay) return null;
  return {
    eta: delay.eta,
    reason: delay.reason,
    message: delay.message,
  };
}

function taskFields(task: Task): DailyReportTask {
  return {
    title: task.title,
    priority: task.priority,
    status: task.status,
  };
}

function statusLine(row: EmployeeDayReport) {
  if (row.statusNote) return `${row.status} · ${row.statusNote}`;
  return row.status;
}

function summaryLine(rows: EmployeeDayReport[]) {
  const counts = {
    "Full day": 0,
    "Half day": 0,
    "In progress": 0,
    Leave: 0,
    Off: 0,
  };
  for (const row of rows) counts[row.status] += 1;

  const parts = [
    counts["Full day"] ? `${counts["Full day"]} full day` : null,
    counts["Half day"] ? `${counts["Half day"]} half day` : null,
    counts["In progress"] ? `${counts["In progress"]} in progress` : null,
    counts.Leave ? `${counts.Leave} leave` : null,
    counts.Off ? `${counts.Off} off` : null,
  ].filter(Boolean);

  return parts.join(" · ") || `${rows.length} people`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
