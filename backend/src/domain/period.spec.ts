import {
  calendarMonthOf,
  isoWeekOf,
  previousCalendarMonthOf,
  previousIsoWeekOf,
} from './period';

describe('isoWeekOf', () => {
  it('finds the containing week from a mid-week date', () => {
    // 2026-08-05 is a Wednesday.
    expect(isoWeekOf('2026-08-05')).toEqual({
      start: '2026-08-03',
      end: '2026-08-09',
    });
  });

  it('is idempotent on the Monday itself', () => {
    expect(isoWeekOf('2026-08-03')).toEqual({
      start: '2026-08-03',
      end: '2026-08-09',
    });
  });

  it('is idempotent on the Sunday itself', () => {
    expect(isoWeekOf('2026-08-09')).toEqual({
      start: '2026-08-03',
      end: '2026-08-09',
    });
  });

  it('spans a month boundary', () => {
    // 2026-08-31 is a Monday; its week runs into September.
    expect(isoWeekOf('2026-08-31')).toEqual({
      start: '2026-08-31',
      end: '2026-09-06',
    });
  });

  it('spans a year boundary', () => {
    // 2026-12-28 is a Monday; its week runs into January 2027.
    expect(isoWeekOf('2026-12-28')).toEqual({
      start: '2026-12-28',
      end: '2027-01-03',
    });
  });
});

describe('previousIsoWeekOf', () => {
  it('is the seven days immediately before the containing week', () => {
    expect(previousIsoWeekOf('2026-08-05')).toEqual({
      start: '2026-07-27',
      end: '2026-08-02',
    });
  });

  it('crosses a year boundary backwards', () => {
    // 2027-01-01 is a Friday, in the week 2026-12-28..2027-01-03.
    expect(previousIsoWeekOf('2027-01-01')).toEqual({
      start: '2026-12-21',
      end: '2026-12-27',
    });
  });
});

describe('calendarMonthOf', () => {
  it('covers a 31-day month', () => {
    expect(calendarMonthOf('2026-08-15')).toEqual({
      start: '2026-08-01',
      end: '2026-08-31',
    });
  });

  it('covers a 30-day month', () => {
    expect(calendarMonthOf('2026-04-15')).toEqual({
      start: '2026-04-01',
      end: '2026-04-30',
    });
  });

  it('covers February in a leap year', () => {
    expect(calendarMonthOf('2024-02-15')).toEqual({
      start: '2024-02-01',
      end: '2024-02-29',
    });
  });

  it('covers February in a non-leap year', () => {
    expect(calendarMonthOf('2026-02-15')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  it('is idempotent on the first and last day of the month', () => {
    expect(calendarMonthOf('2026-08-01')).toEqual({
      start: '2026-08-01',
      end: '2026-08-31',
    });
    expect(calendarMonthOf('2026-08-31')).toEqual({
      start: '2026-08-01',
      end: '2026-08-31',
    });
  });
});

describe('previousCalendarMonthOf', () => {
  it('is the prior month within the same year', () => {
    expect(previousCalendarMonthOf('2026-08-15')).toEqual({
      start: '2026-07-01',
      end: '2026-07-31',
    });
  });

  it('rolls January back to December of the prior year', () => {
    expect(previousCalendarMonthOf('2026-01-15')).toEqual({
      start: '2025-12-01',
      end: '2025-12-31',
    });
  });

  it('lands on a leap February when the prior month is one', () => {
    expect(previousCalendarMonthOf('2024-03-15')).toEqual({
      start: '2024-02-01',
      end: '2024-02-29',
    });
  });
});
