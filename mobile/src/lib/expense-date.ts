/**
 * The create-expense form's Expense Date field is a local concept: the user
 * picks a calendar day from their own device's date picker, in their own
 * wall-clock time. That's deliberately different from the fixed
 * Asia/Ho_Chi_Minh timezone backend/src/domain/calendar-date.ts anchors
 * Period boundaries and the *default* Expense Date to — this file only
 * turns an already-local `Date` (the picker's value) into the `YYYY-MM-DD`
 * string `POST /expenses`'s `expenseDate` field wants.
 *
 * The default itself is never computed here: the create-expense screen
 * omits `expenseDate` from the request entirely until the user actively
 * picks a day, so the server's own "today" — not this device's clock or
 * timezone — is what a freshly-logged expense defaults to. `formatExpenseDateLabel`
 * (format.ts) is what renders that default as "Today · …" before that.
 */

/** `date`'s own year/month/day, zero-padded — never UTC, see the file header. */
export function calendarDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The inverse, for prefilling the picker from an `ExpenseDto`'s
 * `expenseDate`: `YYYY-MM-DD` as *local* midnight. `new Date('2026-08-01')`
 * would parse as UTC midnight — the previous local day anywhere west of UTC
 * — so the components are picked apart and fed to the local constructor.
 */
export function dateFromCalendarString(calendarDate: string): Date {
  const [year = 0, month = 1, day = 1] = calendarDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}
