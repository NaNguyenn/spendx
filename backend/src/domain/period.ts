import { calendarDateFromDate, calendarDateToDate } from './calendar-date';

/**
 * An inclusive range of calendar dates ('YYYY-MM-DD'), as used by
 * `PeriodStatisticsDto` (`GET /expenses/statistics`) and, per
 * backend/CONTEXT.md's Period, the Leaderboard later.
 */
export interface DateRange {
  /** Inclusive, 'YYYY-MM-DD'. */
  start: string;
  /** Inclusive, 'YYYY-MM-DD'. */
  end: string;
}

/**
 * Pure calendar-date string arithmetic — no timezone math. Callers resolve
 * an instant to a calendar date via `calendarDateInAppTimezone` (ADR-0004)
 * *before* calling in here; every function below only ever adds or
 * subtracts whole days from a 'YYYY-MM-DD' string, so a UTC-midnight
 * `@db.Date` column round-trips through it exactly (the same reason
 * `calendarDateToDate` exists).
 */
function addDays(date: string, days: number): string {
  const asDate = calendarDateToDate(date);
  asDate.setUTCDate(asDate.getUTCDate() + days);
  return calendarDateFromDate(asDate);
}

/**
 * The ISO week (Monday through Sunday, inclusive) containing `date` — the
 * Period backend/CONTEXT.md defaults to.
 */
export function isoWeekOf(date: string): DateRange {
  // getUTCDay(): 0 = Sunday .. 6 = Saturday. Days since that week's Monday:
  // Monday itself is 0, Sunday is 6.
  const daysSinceMonday = (calendarDateToDate(date).getUTCDay() + 6) % 7;
  const start = addDays(date, -daysSinceMonday);
  return { start, end: addDays(start, 6) };
}

/** The ISO week immediately preceding the one containing `date`. */
export function previousIsoWeekOf(date: string): DateRange {
  const { start } = isoWeekOf(date);
  const previousStart = addDays(start, -7);
  return { start: previousStart, end: addDays(previousStart, 6) };
}

/** The calendar month (1st through the last day, inclusive) containing `date`. */
export function calendarMonthOf(date: string): DateRange {
  const [year, month] = date.split('-').map(Number) as [number, number];
  const start = firstOfMonth(year, month);
  // Date.UTC's month is 0-indexed, so passing this 1-indexed `month` as-is
  // names the following month; day 0 of that is the last day of `month`
  // itself. This also handles December (rolls into next January) and leap
  // February (JS's own calendar rules apply) with no special-casing.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start,
    end: `${start.slice(0, 8)}${String(lastDay).padStart(2, '0')}`,
  };
}

/** The calendar month immediately preceding the one containing `date`. */
export function previousCalendarMonthOf(date: string): DateRange {
  const [year, month] = date.split('-').map(Number) as [number, number];
  const previousMonthStart =
    month === 1 ? firstOfMonth(year - 1, 12) : firstOfMonth(year, month - 1);
  return calendarMonthOf(previousMonthStart);
}

function firstOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
