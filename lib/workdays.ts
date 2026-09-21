export function isoWeekday(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** 1–5 for a Saturday, otherwise null. */
export function saturdayOfMonth(isoDate: string) {
  if (isoWeekday(isoDate) !== 6) return null;
  return Math.floor((Number(isoDate.slice(8, 10)) - 1) / 7) + 1;
}

/** Sundays always off. 1st, 3rd, and 5th Saturdays off. 2nd and 4th Saturdays working. */
export function isWeeklyOff(isoDate: string) {
  const weekday = isoWeekday(isoDate);
  if (weekday === 0) return true;
  if (weekday !== 6) return false;
  const nth = saturdayOfMonth(isoDate);
  return nth === 1 || nth === 3 || nth === 5;
}

export function weeklyOffReason(isoDate: string) {
  const weekday = isoWeekday(isoDate);
  if (weekday === 0) return "Sunday off.";
  const nth = saturdayOfMonth(isoDate);
  if (nth === 1) return "1st Saturday off.";
  if (nth === 3) return "3rd Saturday off.";
  if (nth === 5) return "5th Saturday off.";
  return "Weekly off.";
}
