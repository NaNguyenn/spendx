import {
  registerDecorator,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

/**
 * The single fixed timezone Period boundaries (and, per issue #4, the
 * default Expense Date) are computed in — see
 * docs/adr/0004-fixed-app-timezone-for-periods.md. Not each User's device
 * timezone, so two Users can never disagree about which calendar day an
 * instant falls on.
 */
export const APP_TIMEZONE = 'Asia/Ho_Chi_Minh';

const appTimezoneFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * The calendar date (`YYYY-MM-DD`) `instant` falls on in the fixed app
 * timezone — the "logging day" an Expense Date defaults to, and (per
 * ADR-0002) the date that anchors the Daily Rate a Converted Amount is
 * frozen at. `en-CA` is a locale trick, not a locale choice: it's the
 * built-in `Intl` formatter whose date order happens to be `YYYY-MM-DD`.
 */
export function calendarDateInAppTimezone(instant: Date): string {
  return appTimezoneFormatter.format(instant);
}

/** A `@db.Date` column round-trips as UTC midnight — see `calendarDateToDate`. */
export function calendarDateFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True for a syntactically- and calendrically-valid `YYYY-MM-DD` string. */
export function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }
  const asDate = calendarDateToDate(value);
  // An out-of-range month (2026-13-01) makes `Date` produce an Invalid Date
  // rather than throw; an out-of-range day (2024-02-30) instead normalizes
  // into the following month. `getTime()` catches the former, and the round
  // trip back through `toISOString()` landing on the same string catches
  // the latter — both fail this check.
  if (Number.isNaN(asDate.getTime())) return false;
  return asDate.toISOString().startsWith(value);
}

/**
 * Parses a `YYYY-MM-DD` calendar date into the UTC-midnight `Date` a
 * `@db.Date` column expects — the one place this parsing happens, so
 * `expenseDate` and `DailyRate.rateDate` are always stored and queried
 * against the same instant for the same calendar date.
 */
export function calendarDateToDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

@ValidatorConstraint({ name: 'isCalendarDate', async: false })
class IsCalendarDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isValidCalendarDate(value);
  }

  defaultMessage(): string {
    return '$property must be a valid calendar date (YYYY-MM-DD)';
  }
}

/** class-validator decorator wrapping `isValidCalendarDate`. */
export function IsCalendarDate(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsCalendarDateConstraint,
    });
  };
}
