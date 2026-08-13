import { calendarDateString, dateFromCalendarString } from './expense-date';

describe('calendarDateString', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(calendarDateString(new Date(2026, 7, 1))).toBe('2026-08-01');
  });

  it('zero-pads a single-digit month and day', () => {
    expect(calendarDateString(new Date(2026, 0, 3))).toBe('2026-01-03');
  });

  it('uses the date object as given, not UTC — 1 Jan local stays 1 Jan', () => {
    // A date at local midnight must not shift to the previous day the way a
    // naive `toISOString().slice(0, 10)` would for any timezone east of UTC.
    const localMidnight = new Date(2026, 0, 1, 0, 0, 0);
    expect(calendarDateString(localMidnight)).toBe('2026-01-01');
  });
});

describe('dateFromCalendarString', () => {
  it('parses YYYY-MM-DD as a local date, not UTC', () => {
    // `new Date('2026-08-01')` would be UTC midnight — the previous local
    // day anywhere west of UTC. The parsed value must be *local* midnight.
    const date = dateFromCalendarString('2026-08-01');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(1);
  });

  it('round-trips with calendarDateString', () => {
    expect(calendarDateString(dateFromCalendarString('2026-01-03'))).toBe(
      '2026-01-03',
    );
  });
});
