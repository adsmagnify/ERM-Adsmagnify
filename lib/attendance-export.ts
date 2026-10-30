import ExcelJS from "exceljs";
import { leaveOnDate } from "@/lib/attendance-display";
import type { Attendance, LeaveRequest, Profile } from "@/lib/database.types";
import { holidayName, isCompanyHoliday, type HolidayMap } from "@/lib/holidays";
import {
  addDays,
  endOfMonth,
  formatIstTime,
  formatWorkedHours,
  istDateFromInstant,
  startOfMonth,
  todayIstDate,
} from "@/lib/time";
import { isWeeklyOff } from "@/lib/workdays";

export type ExportStatus =
  | "Full day"
  | "Half day"
  | "Leave"
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
};

const fills: Record<Exclude<ExportStatus, "">, string> = {
  "Full day": "FFE7F3EE",
  "Half day": "FFF8ECE9",
  Leave: "FFEFE8E0",
  Holiday: "FFECE8F3",
  Off: "FFF4F4F5",
  Absent: "FFFEE2E2",
  "In progress": "FFFEF9C3",
};

const fonts: Record<Exclude<ExportStatus, "">, string> = {
  "Full day": "FF1F7A5A",
  "Half day": "FFB5432F",
  Leave: "FF6B5344",
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
  toDate: string
): AttendanceExportRow[] {
  const today = todayIstDate();
  const employees = people
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
            attendance.find(
              (row) => row.user_id === person.id && row.work_date === cursor
            ) ?? null,
            leaveOnDate(personLeaves, cursor),
            holidays,
            today
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
  toDate: string
) {
  const rows = buildAttendanceExportRows(
    people,
    attendance,
    leaves,
    holidays,
    fromDate,
    toDate
  );
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Adsmagnify Clock";
  workbook.created = new Date();

  addLegendSheet(workbook);
  addAllDaysSheet(workbook, rows);
  addMonthSheets(workbook, people, rows, fromDate, toDate);

  return workbook.xlsx.writeBuffer();
}

function exportRowForDay(
  person: Profile,
  workDate: string,
  attendance: ExportAttendance | null,
  leave: LeaveRequest | null,
  holidays: HolidayMap,
  today: string
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

  sheet.getCell("A11").value = "Holiday column";
  sheet.getCell("A11").font = { bold: true, name: "Calibri" };
  sheet.getCell("B11").value =
    "Yes on company holidays (2 Oct 2026 Gandhi Jayanti, 20 Oct 2026). Weekly offs are Off, not Holiday.";
}

function addAllDaysSheet(workbook: ExcelJS.Workbook, rows: AttendanceExportRow[]) {
  const sheet = workbook.addWorksheet("All days");
  sheet.columns = [
    { header: "Employee", key: "name", width: 22 },
    { header: "Email", key: "email", width: 28 },
    { header: "Date", key: "date", width: 14 },
    { header: "Day", key: "weekday", width: 12 },
    { header: "In", key: "inTime", width: 12 },
    { header: "Out", key: "outTime", width: 12 },
    { header: "Hours", key: "hours", width: 10 },
    { header: "Status", key: "status", width: 14 },
    { header: "Note", key: "statusNote", width: 22 },
    { header: "Holiday", key: "holiday", width: 12 },
  ];

  const header = sheet.getRow(1);
  header.font = { bold: true, name: "Calibri" };
  header.alignment = { vertical: "middle" };
  header.height = 22;

  for (const row of rows) {
    const added = sheet.addRow({
      name: row.name,
      email: row.email,
      date: row.date,
      weekday: row.weekday,
      inTime: row.inTime,
      outTime: row.outTime,
      hours: row.hours,
      status: row.status,
      statusNote: row.statusNote,
      holiday: row.holiday,
    });
    paintStatus(added.getCell("status"), row.status);
    if (row.holiday === "Yes") {
      paintStatus(added.getCell("holiday"), "Holiday");
    }
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length + 1), column: 10 },
  };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function addMonthSheets(
  workbook: ExcelJS.Workbook,
  people: Profile[],
  rows: AttendanceExportRow[],
  fromDate: string,
  toDate: string
) {
  const employees = people
    .filter((person) => person.role === "employee")
    .sort((a, b) =>
      (a.full_name?.trim() || a.email || "").localeCompare(
        b.full_name?.trim() || b.email || ""
      )
    );

  let monthStart = startOfMonth(fromDate);
  while (monthStart <= toDate) {
    const monthEnd = endOfMonth(monthStart) < toDate ? endOfMonth(monthStart) : toDate;
    const dates: string[] = [];
    let cursor = monthStart;
    while (cursor <= monthEnd) {
      dates.push(cursor);
      cursor = addDays(cursor, 1);
    }

    const sheetName = monthSheetName(monthStart);
    const sheet = workbook.addWorksheet(sheetName);
    sheet.getColumn(1).width = 22;
    dates.forEach((_, index) => {
      sheet.getColumn(index + 2).width = 14;
    });

    sheet.getCell(1, 1).value = "Employee";
    sheet.getCell(1, 1).font = { bold: true, name: "Calibri" };
    dates.forEach((date, index) => {
      const col = index + 2;
      sheet.getCell(1, col).value = Number(date.slice(8, 10));
      sheet.getCell(1, col).font = { bold: true, name: "Calibri" };
      sheet.getCell(1, col).alignment = { horizontal: "center" };
      sheet.getCell(2, col).value = weekdayShort(date);
      sheet.getCell(2, col).font = { name: "Calibri", color: { argb: "FF6B6B6B" } };
      sheet.getCell(2, col).alignment = { horizontal: "center" };
    });

    const byKey = new Map(
      rows
        .filter((row) => row.date >= monthStart && row.date <= monthEnd)
        .map((row) => [`${row.userId}|${row.date}`, row])
    );

    employees.forEach((person, personIndex) => {
      const excelRow = personIndex + 3;
      const name = person.full_name?.trim() || person.email || "Employee";
      sheet.getCell(excelRow, 1).value = name;
      sheet.getCell(excelRow, 1).font = { name: "Calibri" };
      sheet.getRow(excelRow).height = 32;

      dates.forEach((date, index) => {
        const cell = sheet.getCell(excelRow, index + 2);
        const row = byKey.get(`${person.id}|${date}`);
        cell.alignment = {
          wrapText: true,
          horizontal: "center",
          vertical: "middle",
        };
        cell.font = { name: "Calibri", size: 9 };
        if (!row) {
          cell.value = "";
          return;
        }
        cell.value = monthCellText(row);
        paintStatus(cell, row.status);
      });
    });

    sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 2 }];
    monthStart = addDays(endOfMonth(monthStart), 1);
  }
}

function monthCellText(row: AttendanceExportRow) {
  if (row.status === "Full day" || row.status === "Half day") {
    return `${row.inTime}\n${row.outTime}`;
  }
  if (row.status === "In progress") {
    return `${row.inTime}\n—`;
  }
  if (row.status === "Leave") {
    return row.statusNote || "Leave";
  }
  if (row.status === "Holiday") {
    return row.statusNote || "Holiday";
  }
  if (!row.status) return "";
  return row.status;
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
