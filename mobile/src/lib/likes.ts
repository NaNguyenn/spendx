/**
 * Pure state math for optimistic Likes (issue #14 — Likes: visible means
 * likeable). Both surfaces that show a Like pill — the Feed (feed.tsx) and
 * the friend drill-down (app/friend/[username].tsx) — flip a `FeedItemDto`
 * or `ExpenseDto` in local state before the `PUT`/`DELETE
 * /expenses/{id}/like` call resolves, then either leave it (success) or call
 * this again to flip it back (failure). There is no separate `revertLike`:
 * a revert is exactly a second `toggleLike` call, since the operation is its
 * own inverse — same "screen owns the fetch, this owns the parts worth
 * unit-testing without a component harness" split as lib/feed.ts.
 */

export interface Likeable {
  id: string;
  likeCount: number;
  likedByViewer: boolean;
}

/**
 * Flips `likedByViewer` and adjusts `likeCount` by ±1 (never below 0, in
 * case local and server state have drifted) for the item matching
 * `expenseId`. Every other item is returned by the same reference it came in
 * with — the memo-preserving rule FeedCard/ExpenseRow's own `memo` depends
 * on, same as dedupeFeedItems's earlier-occurrence-wins reasoning in
 * lib/feed.ts.
 */
export function toggleLike<T extends Likeable>(
  items: readonly T[],
  expenseId: string,
): T[] {
  return items.map((item) => {
    if (item.id !== expenseId) return item;
    const likedByViewer = !item.likedByViewer;
    return {
      ...item,
      likedByViewer,
      likeCount: Math.max(0, item.likeCount + (likedByViewer ? 1 : -1)),
    };
  });
}
