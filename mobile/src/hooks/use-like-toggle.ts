import { useCallback, useRef } from 'react';

import { likeExpense, unlikeExpense } from '@/api/likes';
import type { Likeable } from '@/lib/likes';

/**
 * The optimistic Like toggle (issue #14), shared by both surfaces that show
 * a Like pill — the Feed (feed.tsx, over `FeedItemDto`/`{ items }`) and the
 * friend drill-down (app/friend/[username].tsx, over `ExpenseDto`/
 * `{ expenses }`) — since the two screens' state shapes differ, this hook
 * takes an `applyToggle` callback rather than owning the state itself: each
 * screen supplies its own `setState` wrapped around `lib/likes.ts`'s
 * `toggleLike`, built with `useCallback` so this hook's returned callback
 * stays stable too.
 *
 * Flips local state immediately via `applyToggle`, fires the matching
 * `PUT`/`DELETE` for whichever direction the *pre-toggle* `likedByViewer`
 * implies, then reverts (calls `applyToggle` again — `toggleLike` is its own
 * inverse) on failure. No error banner for a failed Like — it's a low-stakes,
 * instantly-repeatable action, so a silent revert (the pill snapping back) is
 * feedback enough; a 404 specifically means the Expense went invisible
 * mid-scroll (deleted, or its Visibility changed under the viewer) and gets
 * the same silent revert, no special copy this ticket.
 */
export function useLikeToggle(
  token: string | null,
  applyToggle: (expenseId: string) => void,
): (expense: Likeable) => void {
  // Expense ids with a Like toggle in flight — a ref (not state) since it
  // only guards against a double-tap racing itself; a mid-flight tap is
  // dropped rather than queued, same "keep it simple" scope as the ticket
  // asks for. A Set, not a single boolean, since more than one card's Like
  // can be in flight at once.
  const likeInFlightRef = useRef(new Set<string>());

  return useCallback(
    (expense: Likeable) => {
      if (!token) return;
      if (likeInFlightRef.current.has(expense.id)) return;
      likeInFlightRef.current.add(expense.id);

      const wasLiked = expense.likedByViewer;
      applyToggle(expense.id);

      const request = wasLiked
        ? unlikeExpense(token, expense.id)
        : likeExpense(token, expense.id);

      request
        .catch(() => {
          applyToggle(expense.id);
        })
        .finally(() => {
          likeInFlightRef.current.delete(expense.id);
        });
    },
    [token, applyToggle],
  );
}
