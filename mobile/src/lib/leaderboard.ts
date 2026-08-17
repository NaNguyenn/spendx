import type { CategoryTotal } from '@/api/expenses';
import type { LeaderboardRowDto } from '@/api/leaderboard';
import type { StatisticsPeriod } from '@/components/expenses/period-toggle';
import type { ThemeColor } from '@/constants/theme';
import type { TranslationKey } from '@/i18n/en';
import { calendarDateString, dateFromCalendarString } from '@/lib/expense-date';
import { categoryShare, nonzeroCategories } from '@/lib/statistics';

/**
 * Pure display-math and Period-browsing helpers for the Leaderboard screen
 * (mobile ticket #12) — same "server does the domain arithmetic, this only
 * shapes it for rendering" split as `lib/statistics.ts`. Nothing here talks
 * to `fetchLeaderboard`; the screen owns the fetch, this owns the parts of
 * it worth unit-testing without a component harness.
 */

// ---------------------------------------------------------------------------
// Period browsing
// ---------------------------------------------------------------------------

/**
 * How the screen tracks which Period `GET /leaderboard` should return.
 * `anchor: null` means "the current Period" — deliberately *not* a
 * client-computed date: the server decides "today" in the fixed app
 * timezone (ADR-0004), which can disagree with the device's own clock near a
 * Period boundary. `offset` is how many Periods back of the current one is
 * browsed (0 = current, -1 = one Period back, …) — it exists so the Next
 * chevron can be disabled without knowing today's date on-device either.
 */
export interface PeriodBrowseState {
  anchor: string | null;
  offset: number;
}

/** The Period Browser's initial state, and what selecting a new `period` (week/month toggle) resets back to. */
export const CURRENT_PERIOD_BROWSE_STATE: PeriodBrowseState = {
  anchor: null,
  offset: 0,
};

function shiftCalendarDate(calendarDate: string, deltaDays: number): string {
  const date = dateFromCalendarString(calendarDate);
  date.setDate(date.getDate() + deltaDays);
  return calendarDateString(date);
}

/** The calendar day before `displayedStart` (a Leaderboard response's `start`) — the anchor for browsing one Period back. */
export function previousAnchor(displayedStart: string): string {
  return shiftCalendarDate(displayedStart, -1);
}

/** The calendar day after `displayedEnd` (a Leaderboard response's `end`) — the anchor for browsing one Period forward. */
export function nextAnchor(displayedEnd: string): string {
  return shiftCalendarDate(displayedEnd, 1);
}

/** True once the current Period is displayed — the Next chevron has nowhere forward to go. */
export function isNextDisabled(offset: number): boolean {
  return offset === 0;
}

/** Browses one Period further into the past. */
export function browsePrevious(
  state: PeriodBrowseState,
  displayedStart: string,
): PeriodBrowseState {
  return { anchor: previousAnchor(displayedStart), offset: state.offset - 1 };
}

/**
 * Browses one Period forward. Landing back on the current Period always
 * resets to `anchor: null` rather than trusting `nextAnchor`'s arithmetic to
 * have reproduced the exact date the server would call "today" — see
 * `PeriodBrowseState`'s doc comment. This is also what makes walking
 * backward and then forward by the same number of steps land on *exactly*
 * `CURRENT_PERIOD_BROWSE_STATE`, not just an offset of 0 with a stale anchor.
 */
export function browseNext(
  state: PeriodBrowseState,
  displayedEnd: string,
): PeriodBrowseState {
  const offset = state.offset + 1;
  if (offset >= 0) return CURRENT_PERIOD_BROWSE_STATE;
  return { anchor: nextAnchor(displayedEnd), offset };
}

const PERIOD_BROWSER_SUBTITLE_KEY: Record<
  StatisticsPeriod,
  { current: TranslationKey; past: TranslationKey }
> = {
  week: {
    current: 'leaderboard.periodBrowser.currentWeek',
    past: 'leaderboard.periodBrowser.pastWeek',
  },
  month: {
    current: 'leaderboard.periodBrowser.currentMonth',
    past: 'leaderboard.periodBrowser.pastMonth',
  },
};

/** Which "current week" / "past month" (etc.) key the Period Browser's subtitle shows. */
export function periodBrowserSubtitleKey(
  period: StatisticsPeriod,
  offset: number,
): TranslationKey {
  const entry = PERIOD_BROWSER_SUBTITLE_KEY[period];
  return offset === 0 ? entry.current : entry.past;
}

const RANKING_OVERLINE_KEY: Record<
  StatisticsPeriod,
  { current: TranslationKey; past: TranslationKey }
> = {
  week: {
    current: 'leaderboard.ranking.overlineCurrentWeek',
    past: 'leaderboard.ranking.overlinePastWeek',
  },
  month: {
    current: 'leaderboard.ranking.overlineCurrentMonth',
    past: 'leaderboard.ranking.overlinePastMonth',
  },
};

/** Which "THIS WEEK · {count} FRIENDS" (etc.) key the Ranking section's overline shows — the past variant for any browsed-away Period. */
export function rankingOverlineKey(
  period: StatisticsPeriod,
  offset: number,
): TranslationKey {
  const entry = RANKING_OVERLINE_KEY[period];
  return offset === 0 ? entry.current : entry.past;
}

/**
 * The Ranking overline's `{count}` — every row except the viewer's own:
 * a count of Friends, not of rows (the convention the absorbed Friends
 * list's section title used).
 */
export function friendCount(rows: readonly LeaderboardRowDto[]): number {
  return rows.filter((row) => !row.isViewer).length;
}

// ---------------------------------------------------------------------------
// Rank Row display math
// ---------------------------------------------------------------------------

export interface MixSegment {
  category: CategoryTotal['category'];
  /** Share of the row's total, 0–1. */
  fraction: number;
}

/**
 * The Mix Bar's segments: one per non-zero Category, in the server's
 * given (already-sorted) order, sized by its share of the row's total.
 * Empty for a zero-total row — `categoryShare` would otherwise divide by
 * zero, and there is nothing to draw a bar of anyway.
 */
export function mixBarSegments(
  categories: readonly CategoryTotal[],
  total: string,
): MixSegment[] {
  return nonzeroCategories(categories).map((entry) => ({
    category: entry.category,
    fraction: categoryShare(entry.total, total),
  }));
}

export interface RankBadgeStyle {
  /** The badge circle's fill — `gold`/`silver`/`bronze` for ranks 1–3, `surface2` otherwise. */
  fill: ThemeColor;
  /**
   * The rank numeral's color: a fixed hex (`#1C1400`, the design's literal
   * value for every medal — it's the same near-black on all three golds/
   * silvers/bronzes, not a themed token) for ranks 1–3, or `null` for every
   * other rank, where the caller uses `theme.textSecondary` instead (the
   * design's `$text-2`, which *does* need to flip between light and dark).
   */
  numeralColor: string | null;
}

const MEDAL_NUMERAL_COLOR = '#1C1400';

/** Rank 1/2/3 → gold/silver/bronze; every other rank → the plain surface badge. */
export function rankBadgeStyle(rank: number): RankBadgeStyle {
  switch (rank) {
    case 1:
      return { fill: 'gold', numeralColor: MEDAL_NUMERAL_COLOR };
    case 2:
      return { fill: 'silver', numeralColor: MEDAL_NUMERAL_COLOR };
    case 3:
      return { fill: 'bronze', numeralColor: MEDAL_NUMERAL_COLOR };
    default:
      return { fill: 'surface2', numeralColor: null };
  }
}
