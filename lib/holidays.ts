export type HolidayMap = Record<string, string>;

/** Company holidays (not weekly offs). */
export const SEEDED_HOLIDAYS: HolidayMap = {
  "2026-10-02": "Gandhi Jayanti",
  "2026-10-20": "Holiday",
};

export function mergeHolidays(extra?: HolidayMap | null): HolidayMap {
  return { ...SEEDED_HOLIDAYS, ...(extra ?? {}) };
}

export function holidayName(isoDate: string, extra?: HolidayMap | null) {
  return mergeHolidays(extra)[isoDate] ?? null;
}

export function isCompanyHoliday(isoDate: string, extra?: HolidayMap | null) {
  return holidayName(isoDate, extra) != null;
}
