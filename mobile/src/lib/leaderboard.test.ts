import type { CategoryTotal } from '@/api/expenses';
import type { LeaderboardRowDto } from '@/api/leaderboard';

import {
  browseNext,
  browsePrevious,
  CURRENT_PERIOD_BROWSE_STATE,
  friendCount,
  isNextDisabled,
  mixBarSegments,
  nextAnchor,
  periodBrowserSubtitleKey,
  previousAnchor,
  rankBadgeStyle,
  rankingOverlineKey,
  type PeriodBrowseState,
} from './leaderboard';

function category(
  cat: CategoryTotal['category'],
  total: string,
): CategoryTotal {
  return { category: cat, total };
}

function row(overrides: Partial<LeaderboardRowDto> = {}): LeaderboardRowDto {
  return {
    user: { id: 'u-1', username: 'minhtran', displayName: 'Minh Trần' },
    isViewer: false,
    total: '0.0000',
    categories: [],
    ...overrides,
  };
}

describe('previousAnchor', () => {
  it('returns the calendar day before the given start', () => {
    expect(previousAnchor('2026-08-03')).toBe('2026-08-02');
  });

  it('crosses a month boundary', () => {
    expect(previousAnchor('2026-08-01')).toBe('2026-07-31');
  });

  it('crosses a year boundary', () => {
    expect(previousAnchor('2026-01-01')).toBe('2025-12-31');
  });
});

describe('nextAnchor', () => {
  it('returns the calendar day after the given end', () => {
    expect(nextAnchor('2026-08-09')).toBe('2026-08-10');
  });

  it('crosses a month boundary', () => {
    expect(nextAnchor('2026-08-31')).toBe('2026-09-01');
  });

  it('crosses a year boundary', () => {
    expect(nextAnchor('2026-12-31')).toBe('2027-01-01');
  });
});

describe('isNextDisabled', () => {
  it('is disabled at offset 0 — the current Period', () => {
    expect(isNextDisabled(0)).toBe(true);
  });

  it('is enabled at any offset browsed into the past', () => {
    expect(isNextDisabled(-1)).toBe(false);
    expect(isNextDisabled(-3)).toBe(false);
  });
});

describe('browsePrevious', () => {
  it('anchors to the day before the displayed start and decrements offset', () => {
    const next = browsePrevious(CURRENT_PERIOD_BROWSE_STATE, '2026-08-03');
    expect(next).toEqual<PeriodBrowseState>({
      anchor: '2026-08-02',
      offset: -1,
    });
  });

  it('keeps decrementing offset further into the past', () => {
    const once = browsePrevious(CURRENT_PERIOD_BROWSE_STATE, '2026-08-03');
    const twice = browsePrevious(once, '2026-07-27');
    expect(twice.offset).toBe(-2);
    expect(twice.anchor).toBe('2026-07-26');
  });
});

describe('browseNext', () => {
  it('anchors to the day after the displayed end and increments offset', () => {
    const past = { anchor: '2026-07-27', offset: -2 };
    const next = browseNext(past, '2026-08-02');
    expect(next).toEqual<PeriodBrowseState>({
      anchor: '2026-08-03',
      offset: -1,
    });
  });

  it('resets to the null-anchor current state on landing back at offset 0', () => {
    const oneBack = { anchor: '2026-08-02', offset: -1 };
    expect(browseNext(oneBack, '2026-08-09')).toEqual(
      CURRENT_PERIOD_BROWSE_STATE,
    );
  });

  it('never increments past offset 0, even if called anyway', () => {
    expect(browseNext(CURRENT_PERIOD_BROWSE_STATE, '2026-08-09')).toEqual(
      CURRENT_PERIOD_BROWSE_STATE,
    );
  });

  it('round-trips: walking previous then next by the same number of steps lands back on exactly the null-anchor state', () => {
    const one = browsePrevious(CURRENT_PERIOD_BROWSE_STATE, '2026-08-03');
    const two = browsePrevious(one, '2026-07-27');
    const three = browsePrevious(two, '2026-07-20');

    const back2 = browseNext(three, '2026-07-19');
    const back1 = browseNext(back2, '2026-07-26');
    const back0 = browseNext(back1, '2026-08-02');

    expect(back0).toEqual(CURRENT_PERIOD_BROWSE_STATE);
  });
});

describe('periodBrowserSubtitleKey', () => {
  it('is "current week" at offset 0', () => {
    expect(periodBrowserSubtitleKey('week', 0)).toBe(
      'leaderboard.periodBrowser.currentWeek',
    );
  });

  it('is "past week" at any other offset', () => {
    expect(periodBrowserSubtitleKey('week', -1)).toBe(
      'leaderboard.periodBrowser.pastWeek',
    );
  });

  it('is "current month" at offset 0', () => {
    expect(periodBrowserSubtitleKey('month', 0)).toBe(
      'leaderboard.periodBrowser.currentMonth',
    );
  });

  it('is "past month" at any other offset', () => {
    expect(periodBrowserSubtitleKey('month', -4)).toBe(
      'leaderboard.periodBrowser.pastMonth',
    );
  });
});

describe('rankingOverlineKey', () => {
  it('is the current-week key at offset 0', () => {
    expect(rankingOverlineKey('week', 0)).toBe(
      'leaderboard.ranking.overlineCurrentWeek',
    );
  });

  it('is the past-month key away from offset 0', () => {
    expect(rankingOverlineKey('month', -2)).toBe(
      'leaderboard.ranking.overlinePastMonth',
    );
  });
});

describe('friendCount', () => {
  it('counts every row except the viewer', () => {
    const rows = [
      row({ isViewer: true }),
      row({ isViewer: false }),
      row({ isViewer: false }),
    ];
    expect(friendCount(rows)).toBe(2);
  });

  it('is 0 for a viewer-only leaderboard (no friends yet)', () => {
    expect(friendCount([row({ isViewer: true })])).toBe(0);
  });
});

describe('mixBarSegments', () => {
  it('returns one segment per non-zero category, sized by share of the total', () => {
    const categories = [
      category('food', '400.0000'),
      category('housing', '100.0000'),
      category('leisure', '0.0000'),
    ];
    const segments = mixBarSegments(categories, '500.0000');
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ category: 'food', fraction: 0.8 });
    expect(segments[1]).toEqual({ category: 'housing', fraction: 0.2 });
  });

  it('drops zero-total categories entirely', () => {
    const categories = [
      category('food', '0.0000'),
      category('housing', '0.0000'),
    ];
    expect(mixBarSegments(categories, '0.0000')).toEqual([]);
  });

  it('does not divide by zero for a zero-total row', () => {
    const categories = [category('food', '0.0000')];
    expect(mixBarSegments(categories, '0.0000')).toEqual([]);
  });
});

describe('rankBadgeStyle', () => {
  it('is gold with the fixed medal numeral color for rank 1', () => {
    expect(rankBadgeStyle(1)).toEqual({
      fill: 'gold',
      numeralColor: '#1C1400',
    });
  });

  it('is silver for rank 2', () => {
    expect(rankBadgeStyle(2)).toEqual({
      fill: 'silver',
      numeralColor: '#1C1400',
    });
  });

  it('is bronze for rank 3', () => {
    expect(rankBadgeStyle(3)).toEqual({
      fill: 'bronze',
      numeralColor: '#1C1400',
    });
  });

  it('is the plain surface badge, with no fixed numeral color, for rank 4 and beyond', () => {
    expect(rankBadgeStyle(4)).toEqual({ fill: 'surface2', numeralColor: null });
    expect(rankBadgeStyle(10)).toEqual({
      fill: 'surface2',
      numeralColor: null,
    });
  });
});
