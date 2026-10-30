import ExcelJS from "exceljs";
import { leaveOnDate } from "@/lib/attendance-display";
import type {
  Attendance,
  DelayNotice,
  LeaveKind,
  LeaveRequest,
  Profile,
} from "@/lib/database.types";
import { holidayName, isCompanyHoliday, type HolidayMap } from "@/lib/holidays";
import {
  countHalfDayLeave,
  LEAVE_KIND_COLORS,
  LEAVE_KIND_SHORT,
  LEAVE_KINDS,
  leaveBalance,
  leaveTotalsFromProfile,
  leaveYear,
  workingDaysBetween,
} from "@/lib/leave-balance";
import {
  addDays,
  endOfMonth,
  formatIstDate,
  formatIstTime,
  formatWorkedHours,
  istDateFromInstant,
  startOfMonth,
  todayIstDate,
} from "@/lib/time";
import { mergeRecoveredAttendance } from "@/lib/recovered-attendance";
import { isOffDay, isWeeklyOff } from "@/lib/workdays";

export type ExportStatus =
  | "Full day"
  | "Half day"
  | "Leave"
  | "Forgot"
  | "Holiday"
  | "Off"
  | "Absent"
  | "In progress"
  | "";

export type AttendanceExportRow = {
  userId: string;
  name: string;
  email: string;
  date: string;
  weekday: string;
  inTime: string;
  outTime: string;
  hours: string;
  status: ExportStatus;
  statusNote: string;
  holiday: "Yes" | "No";
  delayEmailed: boolean;
};

const fills: Record<Exclude<ExportStatus, "">, string> = {
  "Full day": "FFE7F3EE",
  "Half day": "FFF8ECE9",
  Leave: "FFEFE8E0",
  Forgot: "FFE0F2FE",
  Holiday: "FFECE8F3",
  Off: "FFF4F4F5",
  Absent: "FFFEE2E2",
  "In progress": "FFFEF9C3",
};

const fonts: Record<Exclude<ExportStatus, "">, string> = {
  "Full day": "FF1F7A5A",
  "Half day": "FFB5432F",
  Leave: "FF6B5344",
  Forgot: "FF0369A1",
  Holiday: "FF5B4A7A",
  Off: "FF6B6B6B",
  Absent: "FF9F1239",
  "In progress": "FF854D0E",
};

type ExportAttendance = Pick<
  Attendance,
  "user_id" | "work_date" | "clock_in" | "clock_out" | "status" | "status_reason"
>;

export function buildAttendanceExportRows(
  people: Profile[],
  attendance: ExportAttendance[],
  leaves: LeaveRequest[],
  holidays: HolidayMap,
  fromDate: string,
  toDate: string,
  delays: Pick<DelayNotice, "user_id" | "work_date">[] = []
): AttendanceExportRow[] {
  const recovered = mergeRecoveredAttendance(people, attendance);
  const today = todayIstDate();
  const employees = recovered.people
    .filter((person) => person.role === "employee")
    .sort((a, b) =>
      (a.full_name?.trim() || a.email || "").localeCompare(
        b.full_name?.trim() || b.email || ""
      )
    );

  const rows: AttendanceExportRow[] = [];

  for (const person of employees) {
    const joinedOn = istDateFromInstant(person.created_at);
    const personLeaves = leaves.filter((row) => row.user_id === person.id);
    let cursor = fromDate;
    while (cursor <= toDate) {
      if (cursor >= joinedOn) {
        rows.push(
          exportRowForDay(
            person,
            cursor,
            recovered.attendance.find(
              (row) => row.user_id === person.id && row.work_date === cursor
            ) ?? null,
            leaveOnDate(personLeaves, cursor),
            holidays,
            today,
            delays.some(
              (row) => row.user_id === person.id && row.work_date === cursor
            ),
            recovered.recoveredUserIds.has(person.id)
          )
        );
      }
      cursor = addDays(cursor, 1);
    }
  }

  return rows;
}

export async function attendanceWorkbookBuffer(
  people: Profile[],
  attendance: ExportAttendance[],
  leaves: LeaveRequest[],
  holidays: HolidayMap,
  fromDate: string,
  toDate: string,
  reportSentDates: Set<string> = new Set(),
  delays: Pick<DelayNotice, "user_id" | "work_date">[] = []
) {
  const recovered = mergeRecoveredAttendance(people, attendance);
  const rows = buildAttendanceExportRows(
    recovered.people,
    recovered.attendance,
    leaves,
    holidays,
    fromDate,
    toDate,
    delays
  );
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Adsmagnify Clock";
  workbook.created = new Date();

  addMonthSheets(workbook, recovered.people, rows, fromDate, toDate, reportSentDates);
  addLeavesSheet(
    workbook,
    recovered.people.filter((person) => !recovered.recoveredUserIds.has(person.id)),
    leaves,
    recovered.attendance
  );
  addLegendSheet(workbook);

  return workbook.xlsx.writeBuffer();
}

function exportRowForDay(
  person: Profile,
  workDate: string,
  attendance: ExportAttendance | null,
  leave: LeaveRequest | null,
  holidays: HolidayMap,
  today: string,
  delayEmailed: boolean,
  recovered = false
): AttendanceExportRow {
  const name = person.full_name?.trim() || person.email || "Employee";
  const holiday = isCompanyHoliday(workDate, holidays);
  const weekday = weekdayShort(workDate);
  const inTime = formatIstTime(attendance?.clock_in ?? null);
  const outTime = formatIstTime(attendance?.clock_out ?? null);
  const hours = formatWorkedHours(
    attendance?.clock_in ?? null,
    attendance?.clock_out ?? null
  );

  const base = {
    userId: person.id,
    name,
    email: person.email ?? "",
    date: workDate,
    weekday,
    inTime: attendance?.clock_in ? inTime : "—",
    outTime: attendance?.clock_out ? outTime : "—",
    hours: attendance?.clock_in && attendance?.clock_out ? hours : "—",
    holiday: holiday ? ("Yes" as const) : ("No" as const),
    delayEmailed,
  };

  if (holiday && !attendance?.clock_in) {
    return {
      ...base,
      status: "Holiday",
      statusNote: holidayName(workDate, holidays) ?? "Holiday",
    };
  }

  if (isWeeklyOff(workDate) && !attendance?.clock_in) {
    return {
      ...base,
      status: "Off",
      statusNote: "Weekly off",
    };
  }

  if (!attendance?.clock_in && attendance?.status === "Full day") {
    return {
      ...base,
      status: "Forgot",
      statusNote: "Forgot to clock in",
    };
  }

  if (!attendance?.clock_in && (attendance?.status === "Leave" || leave)) {
    const kind =
      attendance?.status === "Leave" && attendance.status_reason
        ? attendance.status_reason
        : leave?.kind;
    return {
      ...base,
      status: "Leave",
      statusNote: kind ?? "Leave",
    };
  }

  if (attendance?.clock_in && !attendance.clock_out) {
    if (recovered && workDate < today) {
      return {
        ...base,
        inTime,
        status: "",
        statusNote: "",
      };
    }
    return {
      ...base,
      inTime,
      status: "In progress",
      statusNote: workDate === today ? "Still open" : "No clock-out",
    };
  }

  if (attendance?.clock_out) {
    const status: ExportStatus =
      attendance.status === "Half day" ? "Half day" : "Full day";
    return {
      ...base,
      inTime,
      outTime,
      hours,
      status,
      statusNote: attendance.status_reason ?? "",
    };
  }

  if (workDate < today) {
    if (recovered) {
      return {
        ...base,
        status: "",
        statusNote: "",
      };
    }
    return {
      ...base,
      status: "Absent",
      statusNote: "",
    };
  }

  return {
    ...base,
    status: "",
    statusNote: "",
  };
}

function addLegendSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet("Legend", {
    views: [{ showGridLines: false }],
  });
  sheet.getColumn(1).width = 18;
  sheet.getColumn(2).width = 64;

  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").value = "Adsmagnify attendance colours";
  sheet.getCell("A1").font = { bold: true, size: 14, name: "Calibri" };

  const items: { status: Exclude<ExportStatus, "">; note: string }[] = [
    { status: "Full day", note: "Clocked in and completed the day." },
    { status: "Half day", note: "Late, left early, or marked half day." },
    { status: "Leave", note: "Approved leave (casual, sick, or comp off)." },
    {
      status: "Forgot",
      note: "Present, but forgot to clock in. Not leave and not absent.",
    },
    {
      status: "Holiday",
      note: "Company holiday. Not marked absent.",
    },
    { status: "Off", note: "Weekly off (Sunday, 1st/3rd/5th Saturday)." },
    {
      status: "Absent",
      note: "Working day with no clock-in. Holidays are never absent.",
    },
    { status: "In progress", note: "Clocked in, not yet clocked out." },
  ];

  items.forEach((item, index) => {
    const row = 3 + index;
    paintStatus(sheet.getCell(row, 1), item.status);
    sheet.getCell(row, 1).value = item.status;
    sheet.getCell(row, 2).value = item.note;
    sheet.getCell(row, 2).font = { name: "Calibri", size: 11 };
  });

  const layoutRow = 3 + items.length + 1;
  sheet.getCell(layoutRow, 1).value = "Layout";
  sheet.getCell(layoutRow, 1).font = { bold: true, name: "Calibri" };
  sheet.getCell(layoutRow, 2).value =
    "Each employee is a block: IN, in time, OUT, out time, kind of day, then delay message sent as yes or no. IN, OUT, and kind of day use the same colour. Holiday and weekly off show only holiday/off — no IN or OUT.";
}

const PERSON_ROWS = 4;

function addMonthSheets(
  workbook: ExcelJS.Workbook,
  people: Profile[],
  rows: AttendanceExportRow[],
  fromDate: string,
  toDate: string,
  reportSentDates: Set<string>
) {
  const months: string[] = [];
  let monthStart = startOfMonth(fromDate);
  while (monthStart <= toDate) {
    months.push(monthStart);
    monthStart = addDays(endOfMonth(monthStart), 1);
  }
  months.reverse();

  for (const start of months) {
    const monthEnd = endOfMonth(start) < toDate ? endOfMonth(start) : toDate;
    const dates: string[] = [];
    let cursor = start;
    while (cursor <= monthEnd) {
      dates.push(cursor);
      cursor = addDays(cursor, 1);
    }

    const employees = people
      .filter((person) => person.role === "employee")
      .filter((person) => istDateFromInstant(person.created_at) <= monthEnd)
      .sort((a, b) =>
        (a.full_name?.trim() || a.email || "").localeCompare(
          b.full_name?.trim() || b.email || ""
        )
      );

    const sheet = workbook.addWorksheet(monthSheetName(start));
    sheet.getColumn(1).width = 22;
    sheet.getColumn(2).width = 20;
    dates.forEach((_, index) => {
      sheet.getColumn(index + 3).width = 12;
    });

    const employeeHeader = sheet.getCell(1, 1);
    employeeHeader.value = "Employee";
    employeeHeader.font = { bold: true, name: "Calibri", size: 11 };
    employeeHeader.alignment = { vertical: "middle" };

    sheet.getCell(2, 2).value = "";
    dates.forEach((date, index) => {
      const cell = sheet.getCell(1, index + 3);
      cell.value = `${Number(date.slice(8, 10))} ${weekdayShort(date)}`;
      cell.font = { bold: true, name: "Calibri", size: 10 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      if (isCompanyHoliday(date)) paintStatus(cell, "Holiday");
      else if (isWeeklyOff(date)) paintStatus(cell, "Off");
    });
    sheet.getRow(1).height = 22;

    const emailLabel = sheet.getCell(2, 1);
    emailLabel.value = "Day report emailed";
    emailLabel.font = { name: "Calibri", size: 10, italic: true };
    dates.forEach((date, index) => {
      const cell = sheet.getCell(2, index + 3);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font = { name: "Calibri", size: 9, bold: true };
      if (isOffDay(date)) {
        cell.value = "—";
        cell.font = { name: "Calibri", size: 9, color: { argb: "FF6B6B6B" } };
        return;
      }
      if (reportSentDates.has(date)) {
        cell.value = "Yes";
        paintStatus(cell, "Full day");
        return;
      }
      cell.value = "No";
      paintStatus(cell, "Absent");
    });
    sheet.getRow(2).height = 20;

    const byKey = new Map(
      rows
        .filter((row) => row.date >= start && row.date <= monthEnd)
        .map((row) => [`${row.userId}|${row.date}`, row])
    );

    employees.forEach((person, personIndex) => {
      const startRow = 3 + personIndex * (PERSON_ROWS + 1);
      const endRow = startRow + PERSON_ROWS - 1;
      sheet.mergeCells(startRow, 1, endRow, 1);
      const nameCell = sheet.getCell(startRow, 1);
      nameCell.value = person.full_name?.trim() || person.email || "Employee";
      nameCell.font = { name: "Calibri", size: 11 };
      nameCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };

      const fieldLabels = ["IN", "OUT", "kind of day", "delay message sent"];
      fieldLabels.forEach((label, offset) => {
        const cell = sheet.getCell(startRow + offset, 2);
        cell.value = label;
        cell.font = {
          name: "Calibri",
          size: 9,
          color: { argb: "FF6B6B6B" },
        };
        cell.alignment = { vertical: "middle" };
      });

      dates.forEach((date, index) => {
        const col = index + 3;
        const row = byKey.get(`${person.id}|${date}`);
        const offOrHoliday =
          row?.status === "Holiday" ||
          row?.status === "Off" ||
          row?.status === "Forgot" ||
          row?.status === "Leave";
        const inTime = clockDisplay(row?.inTime);
        const outTime = clockDisplay(row?.outTime);
        const usesTimes = !offOrHoliday && Boolean(inTime);

        const values = offOrHoliday
          ? ["", "", statusLabel(row!).toLowerCase(), row?.delayEmailed ? "yes" : "no"]
          : [
              usesTimes && inTime ? inTime : "",
              usesTimes && outTime ? outTime : "",
              row?.status ? statusLabel(row).toLowerCase() : "",
              row?.delayEmailed ? "yes" : "no",
            ];

        values.forEach((value, offset) => {
          const cell = sheet.getCell(startRow + offset, col);
          cell.value = value;
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { name: "Calibri", size: 10 };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE8E4DE" } },
            left: { style: "thin", color: { argb: "FFE8E4DE" } },
            bottom: { style: "thin", color: { argb: "FFE8E4DE" } },
            right: { style: "thin", color: { argb: "FFE8E4DE" } },
          };
        });

        if (row?.status) {
          paintStatus(sheet.getCell(startRow, col), row.status);
          paintStatus(sheet.getCell(startRow + 1, col), row.status);
          paintStatus(sheet.getCell(startRow + 2, col), row.status);
        }
        const delayCell = sheet.getCell(startRow + 3, col);
        if (row?.delayEmailed) paintStatus(delayCell, "In progress");
        else delayCell.font = { name: "Calibri", size: 10, bold: true };
      });
    });

    sheet.views = [{ state: "frozen", xSplit: 2, ySplit: 2 }];
    sheet.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
    };
  }
}

function clockDisplay(value?: string) {
  if (!value || value === "—") return "";
  return value.replace(/\s*(am|pm)$/i, "").trim();
}

function statusLabel(row: AttendanceExportRow) {
  if (row.status === "Leave") {
    const kind = row.statusNote?.trim();
    return kind && kind !== "Leave" ? `${kind} leave` : "Leave";
  }
  if (row.status === "Holiday") return "holiday";
  if (row.status === "Forgot") return "forgot to clock in";
  return row.status;
}

function addLeavesSheet(
  workbook: ExcelJS.Workbook,
  people: Profile[],
  leaves: LeaveRequest[],
  attendance: ExportAttendance[] = []
) {
  const sheet = workbook.addWorksheet("Leaves");
  const employees = people
    .filter((person) => person.role === "employee")
    .sort((a, b) =>
      (a.full_name?.trim() || a.email || "").localeCompare(
        b.full_name?.trim() || b.email || ""
      )
    );
  const byId = new Map(people.map((person) => [person.id, person]));
  const employeeOrder = new Map(employees.map((person, index) => [person.id, index]));

  sheet.getColumn(1).width = 22;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 16;
  sheet.getColumn(5).width = 10;
  sheet.getColumn(6).width = 12;
  sheet.getColumn(7).width = 40;
  for (let col = 8; col <= 15; col += 1) {
    sheet.getColumn(col).width = col === 11 ? 3 : 12;
  }
  sheet.getColumn(6).width = 3;

  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = "Leave requests";
  sheet.getCell("A1").font = { bold: true, name: "Calibri", size: 14 };

  const requestHeaders = [
    "Employee",
    "Kind",
    "From",
    "To",
    "Days",
    "Status",
    "Reason",
  ];
  requestHeaders.forEach((header, index) => {
    const cell = sheet.getCell(2, index + 1);
    cell.value = header;
    cell.font = { bold: true, name: "Calibri", size: 11 };
  });

  const sorted = [...leaves].sort((a, b) => {
    const byPerson =
      (employeeOrder.get(a.user_id) ?? 999) - (employeeOrder.get(b.user_id) ?? 999);
    if (byPerson !== 0) return byPerson;
    const from = a.from_date.localeCompare(b.from_date);
    if (from !== 0) return from;
    return a.kind.localeCompare(b.kind);
  });

  if (sorted.length === 0) {
    sheet.getCell("A3").value = "No leave requests yet.";
    sheet.getCell("A3").font = { name: "Calibri", size: 11, italic: true };
  } else {
    sorted.forEach((leave, index) => {
      const person = byId.get(leave.user_id);
      const row = 3 + index;
      sheet.getCell(row, 1).value =
        person?.full_name?.trim() || person?.email || "Employee";
      sheet.getCell(row, 2).value = leave.kind;
      sheet.getCell(row, 3).value = formatIstDate(leave.from_date, {
        weekday: "short",
        month: "short",
      });
      sheet.getCell(row, 4).value = formatIstDate(leave.to_date, {
        weekday: "short",
        month: "short",
      });
      sheet.getCell(row, 5).value = workingDaysBetween(
        leave.from_date,
        leave.to_date
      );
      sheet.getCell(row, 6).value = leave.status;
      sheet.getCell(row, 7).value = leave.reason;
      for (let col = 1; col <= 7; col += 1) {
        sheet.getCell(row, col).font = { name: "Calibri", size: 11 };
        sheet.getCell(row, col).alignment = { vertical: "middle" };
      }
      paintLeaveKind(sheet.getCell(row, 2), leave.kind);
      if (leave.status === "Approved") paintLeaveKind(sheet.getCell(row, 6), leave.kind);
      if (leave.status === "Pending") {
        paintStatus(sheet.getCell(row, 6), "In progress");
      }
      if (leave.status === "Rejected") paintStatus(sheet.getCell(row, 6), "Absent");
    });
  }

  const year = leaveYear();
  const balanceTitleRow = (sorted.length === 0 ? 1 : sorted.length) + 5;
  sheet.mergeCells(balanceTitleRow, 1, balanceTitleRow, 15);
  sheet.getCell(balanceTitleRow, 1).value = `Leave balances · ${year}`;
  sheet.getCell(balanceTitleRow, 1).font = {
    bold: true,
    name: "Calibri",
    size: 14,
  };
  sheet.getCell(balanceTitleRow + 1, 1).value =
    "Half days count as 0.5 casual leave (CL).";
  sheet.getCell(balanceTitleRow + 1, 1).font = {
    name: "Calibri",
    size: 10,
    italic: true,
    color: { argb: "FF6B6B6B" },
  };

  const groupHeaderRow = balanceTitleRow + 2;
  const metricHeaderRow = balanceTitleRow + 3;
  sheet.getCell(metricHeaderRow, 1).value = "Employee";
  sheet.getCell(metricHeaderRow, 1).font = { bold: true, name: "Calibri" };

  LEAVE_KINDS.forEach((kind, index) => {
    const startCol = 2 + index * 5;
    const endCol = startCol + 3;
    sheet.mergeCells(groupHeaderRow, startCol, groupHeaderRow, endCol);
    const group = sheet.getCell(groupHeaderRow, startCol);
    group.value = `${kind} (${LEAVE_KIND_SHORT[kind]})`;
    group.alignment = { horizontal: "center" };
    paintLeaveKind(group, kind);

    ["Total", "Used", "Pending", "Remaining"].forEach((label, offset) => {
      const cell = sheet.getCell(metricHeaderRow, startCol + offset);
      cell.value = label;
      cell.alignment = { horizontal: "center" };
      paintLeaveKind(cell, kind, 10);
    });
  });

  employees.forEach((person, index) => {
    const row = metricHeaderRow + 1 + index;
    sheet.getCell(row, 1).value =
      person.full_name?.trim() || person.email || "Employee";
    sheet.getCell(row, 1).font = { name: "Calibri", size: 11 };
    const balances = leaveBalance(
      leaves.filter((item) => item.user_id === person.id),
      leaveTotalsFromProfile(person),
      year,
      countHalfDayLeave(
        attendance.filter((item) => item.user_id === person.id),
        year
      )
    );
    balances.forEach((balance, kindIndex) => {
      const startCol = 2 + kindIndex * 5;
      const values = [
        balance.total,
        balance.used,
        balance.pending,
        balance.remaining,
      ];
      values.forEach((value, offset) => {
        const cell = sheet.getCell(row, startCol + offset);
        cell.value = value;
        cell.numFmt = Number.isInteger(value) ? "0" : "0.0";
        cell.alignment = { horizontal: "center" };
        paintLeaveKind(cell, balance.kind);
      });
    });
  });

  sheet.views = [{ state: "frozen", ySplit: 2 }];
}

function paintLeaveKind(cell: ExcelJS.Cell, kind: LeaveKind, size = 11) {
  const colors = LEAVE_KIND_COLORS[kind];
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colors.fill },
  };
  cell.font = {
    name: "Calibri",
    size,
    color: { argb: colors.font },
    bold: true,
  };
}

function paintStatus(cell: ExcelJS.Cell, status: ExportStatus) {
  cell.font = { ...(cell.font ?? {}), name: "Calibri", size: cell.font?.size ?? 11 };
  if (!status) return;
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fills[status] },
  };
  cell.font = {
    ...cell.font,
    color: { argb: fonts[status] },
    bold: true,
  };
}

function weekdayShort(isoDate: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(new Date(`${isoDate}T12:00:00+05:30`));
}

function monthSheetName(isoDate: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    year: "numeric",
  }).format(new Date(`${isoDate}T12:00:00+05:30`));
}
