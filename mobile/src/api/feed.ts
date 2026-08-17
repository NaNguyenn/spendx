import { apiGet, type OkJson } from '@/api/client';
import type { paths } from '@/api/schema';

/**
 * Thin wrapper around `GET /feed` — same shape as expenses.ts and
 * leaderboard.ts. Domain vocabulary (Feed, Public, Logged At, Conversion
 * Snapshot) is backend/CONTEXT.md's Money/Feed entries (mobile ticket #13).
 * Types are derived from the generated `paths`/`components` (ADR-0007), not
 * hand-copied.
 */

export type FeedPageDto = OkJson<paths['/feed']['get']>;
export type FeedItemDto = FeedPageDto['items'][number];

export interface FetchFeedPageOptions {
  /** A previous page's `nextCursor`. Omitted (or `undefined`) fetches the first page. */
  cursor?: string;
  /** Page size, 1–50 server-side; omitted defaults to the server's own 20. */
  limit?: number;
}

/**
 * One page of the Feed: every Public Expense app-wide, newest first by
 * Logged At, each amount already converted into the caller's Preferred
 * Currency via its frozen Conversion Snapshot (ADR-0008) — re-reading after
 * a Daily Rate change never changes an already-fetched item. Keyset-paginated
 * via `nextCursor`; `null` once exhausted.
 */
export function fetchFeedPage(
  token: string,
  { cursor, limit }: FetchFeedPageOptions = {},
): Promise<FeedPageDto> {
  return apiGet('/feed', {
    token,
    // `query` values are `string | undefined` (client.ts); `limit` is a
    // JSON number in the schema, so it's stringified for the wire the same
    // way every other numeric-looking query param in this layer would be.
    query: { cursor, limit: limit === undefined ? undefined : String(limit) },
  });
}
