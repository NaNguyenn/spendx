import type { CategoryTotal } from '@/api/expenses';

/**
 * Pure display-math helpers for the Expenses tab's Summary Card (mobile
 * ticket #7). `GET /expenses/statistics` already does every domain
 * computation server-side — Period boundaries, the Category sort, the
 * previous-Period comparison (ADR-0004) — so nothing here re-derives a
 * Period or re-sums an Expense; this is only the client-side arithmetic
 * needed to *render* what the server already computed: a category's share
 * of the period total, and the delta chip's direction/magnitude.
 *
 * `total`/`previousTotal`/a `CategoryTotal.total` are always the API's
 * 4-decimal-place fixed-scale strings. `parseTotal` is the one place that
 * turns one into a `number` — the same `Number(...)` bridge
 * lib/amount-input.ts's `formatExpenseAmount` uses for the same values, with
 * the same precision caveat (display-only, never round-tripped back to the
 * API).
 */

/** A decimal-string total as a plain number, for display math only. */
export function parseTotal(total: string): number {
  return Number(total);
}

/**
 * A category's total as a fraction of the *period* total (not the largest
 * category) — 0 when the period total is zero, since dividing by zero would
 * otherwise yield `NaN` for what is already the zero state.
 */
export function categoryShare(
  categoryTotal: string,
  periodTotal: string,
): number {
  const period = parseTotal(periodTotal);
  if (period === 0) return 0;
  return parseTotal(categoryTotal) / period;
}

export type StatisticsDeltaDirection = 'up' | 'down';

export interface StatisticsDelta {
  /** 'down' = spent less than the previous Period, 'up' = spent more. */
  direction: StatisticsDeltaDirection;
  /** `|total - previousTotal| / previousTotal`, a fraction for `formatPercent`. */
  fraction: number;
}

/**
 * The delta chip's direction and magnitude, or `null` when the chip should
 * be hidden entirely: `total` is zero (the zero state never shows a delta,
 * even against a nonzero `previousTotal` — decided so "spent nothing"
 * doesn't read as "100% less than last week", which would be a
 * technically-true but odd claim for an empty period), `previousTotal` is
 * zero (no baseline to compare against — a fraction-of-zero delta is
 * meaningless, not "up 100%"), or the two are equal (no change to report).
 */
export function computeStatisticsDelta(
  total: string,
  previousTotal: string,
): StatisticsDelta | null {
  const current = parseTotal(total);
  const previous = parseTotal(previousTotal);

  if (current === 0) return null;
  if (previous === 0) return null;
  if (current === previous) return null;

  return {
    direction: current > previous ? 'up' : 'down',
    fraction: Math.abs(current - previous) / previous,
  };
}

/**
 * The server already sorts every Category descending, zeros included
 * (backend/CONTEXT.md) — this only drops the zero rows the Breakdown
 * doesn't render, preserving that order.
 */
export function nonzeroCategories(
  categories: readonly CategoryTotal[],
): CategoryTotal[] {
  return categories.filter((entry) => parseTotal(entry.total) !== 0);
}
