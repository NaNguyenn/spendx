import { apiGet } from '@/api/client';
import type { components } from '@/api/schema';

/**
 * Thin wrapper around `GET /leaderboard` — same shape as expenses.ts and
 * friends.ts. Domain vocabulary (Leaderboard, Period, Shareable Spend) is
 * backend/CONTEXT.md's Leaderboard section (mobile ticket #12).
 */

export type Period = components['schemas']['Period'];
export type LeaderboardRowDto = components['schemas']['LeaderboardRowDto'];
export type LeaderboardDto = components['schemas']['LeaderboardDto'];

export interface FetchLeaderboardOptions {
  period: Period;
  /**
   * Any calendar date (YYYY-MM-DD) inside the desired Period; omitted
   * browses the current one (the server's own "today", in the fixed app
   * timezone — never computed on-device). See lib/leaderboard.ts's
   * `PeriodBrowseState` for how the screen tracks which Period is browsed.
   */
  anchor?: string;
}

/**
 * The caller and every Friend, ranked by Shareable Spend within one Period,
 * in the caller's Preferred Currency. Every Friend is always present,
 * zero-filled (ADR-0003) — this never returns an empty `rows` array.
 */
export function fetchLeaderboard(
  token: string,
  { period, anchor }: FetchLeaderboardOptions,
): Promise<LeaderboardDto> {
  return apiGet('/leaderboard', {
    token,
    query: { period, anchor },
  });
}
