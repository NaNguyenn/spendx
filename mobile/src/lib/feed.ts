import type { FeedItemDto, FeedPageDto } from '@/api/feed';

/**
 * Pure pagination state math for the Feed screen (mobile ticket #13) — same
 * "screen owns the fetch, this owns the parts worth unit-testing without a
 * component harness" split as lib/leaderboard.ts. `GET /feed` is
 * keyset-paginated (backend/CONTEXT.md's Feed entry: newest first by Logged
 * At), so two pages should never repeat an id — `dedupeFeedItems` still
 * guards against it defensively, since a duplicate row would collide
 * `FlatList`'s `keyExtractor` and is worth a Set pass to rule out.
 */

export interface FeedLoadState {
  /** Every item loaded so far, in the order the API returned them (newest first) — never re-sorted client-side. */
  items: readonly FeedItemDto[];
  /** Pass as the next page's `cursor`; `null` once the Feed is exhausted. */
  nextCursor: string | null;
}

/**
 * Drops a later duplicate id, keeping the earlier occurrence — the item as
 * first fetched wins over a same-id repeat arriving on a later page.
 */
export function dedupeFeedItems(items: readonly FeedItemDto[]): FeedItemDto[] {
  const seen = new Set<string>();
  const result: FeedItemDto[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

/**
 * The state after a first page — the initial load, or a pull-to-refresh
 * (which always re-fetches with a fresh, cursor-less request): replaces
 * whatever was loaded before rather than appending to it.
 */
export function resetFeedState(page: FeedPageDto): FeedLoadState {
  return { items: dedupeFeedItems(page.items), nextCursor: page.nextCursor };
}

/** The state after a subsequent page (`?cursor=` continuation) is appended onto what's already loaded. */
export function appendFeedPage(
  state: FeedLoadState,
  page: FeedPageDto,
): FeedLoadState {
  return {
    items: dedupeFeedItems([...state.items, ...page.items]),
    nextCursor: page.nextCursor,
  };
}
