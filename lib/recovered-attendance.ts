import type { Profile } from "@/lib/database.types";

/** IST wall times captured before Sumati's account was deleted. */
function istInstant(workDate: string, time: string) {
  return new Date(`${workDate}T${time}+05:30`).toISOString();
}

export type RecoveredAttendance = {
  user_id: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: "Full day" | "Half day" | "Leave" | null;
  status_reason: "Late arrival" | "Left early" | "Casual" | "Sick" | null;
};

const SUMATI_ID = "8bb0e383-47b5-450e-92bd-927e18433a53";

const sumatiProfile: Profile = {
  id: SUMATI_ID,
  full_name: "Sumati",
  email: "sumati@adsmagnify.in",
  role: "employee",
  clock_in_by: "11:00:00",
  clock_out_after: "16:00:00",
  wednesday_clock_in_by: null,
  remote_ok: false,
  casual_total: 0,
  sick_total: 0,
  comp_off_total: 0,
  created_at: "2026-10-01T00:00:00.000+05:30",
};

const sumatiAttendance: RecoveredAttendance[] = [
  {
    user_id: SUMATI_ID,
    work_date: "2026-10-06",
    clock_in: istInstant("2026-10-06", "12:58:57.565949"),
    clock_out: istInstant("2026-10-06", "18:41:53.124170"),
    status: "Half day",
    status_reason: "Late arrival",
  },
  {
    user_id: SUMATI_ID,
    work_date: "2026-10-07",
    clock_in: istInstant("2026-10-07", "12:35:02.949368"),
    clock_out: istInstant("2026-10-07", "17:57:16.064902"),
    status: "Half day",
    status_reason: "Late arrival",
  },
  {
    user_id: SUMATI_ID,
    work_date: "2026-10-08",
    clock_in: istInstant("2026-10-08", "15:01:52.323338"),
    clock_out: istInstant("2026-10-08", "19:06:17.216624"),
    status: "Half day",
    status_reason: "Late arrival",
  },
  {
    user_id: SUMATI_ID,
    work_date: "2026-10-21",
    clock_in: istInstant("2026-10-21", "11:40:27.920496"),
    clock_out: istInstant("2026-10-21", "18:07:32.366840"),
    status: "Half day",
    status_reason: "Late arrival",
  },
  {
    user_id: SUMATI_ID,
    work_date: "2026-10-22",
    clock_in: istInstant("2026-10-22", "12:54:37.249415"),
    clock_out: istInstant("2026-10-22", "19:04:43.589290"),
    status: "Half day",
    status_reason: "Late arrival",
  },
  {
    user_id: SUMATI_ID,
    work_date: "2026-10-23",
    clock_in: istInstant("2026-10-23", "11:23:09.930896"),
    clock_out: null,
    status: null,
    status_reason: null,
  },
];

const recoveredEmployees = [
  { profile: sumatiProfile, attendance: sumatiAttendance },
];

export function mergeRecoveredAttendance<
  TPerson extends Pick<Profile, "id" | "email">,
  TRow extends { user_id: string; work_date: string },
>(people: TPerson[], attendance: TRow[]) {
  const peopleOut = [...people];
  const attendanceOut = [...attendance];
  const recoveredUserIds = new Set<string>();
  const existingKeys = new Set(
    attendance.map((row) => `${row.user_id}|${row.work_date}`)
  );

  for (const recovered of recoveredEmployees) {
    const live = people.find(
      (person) =>
        person.id === recovered.profile.id ||
        Boolean(person.email && person.email === recovered.profile.email)
    );
    const userId = live?.id ?? recovered.profile.id;
    recoveredUserIds.add(userId);
    if (!live) {
      peopleOut.push(recovered.profile as TPerson);
    }
    for (const row of recovered.attendance) {
      const key = `${userId}|${row.work_date}`;
      if (existingKeys.has(key)) continue;
      attendanceOut.push({ ...row, user_id: userId } as TRow);
      existingKeys.add(key);
    }
  }

  return { people: peopleOut, attendance: attendanceOut, recoveredUserIds };
}
