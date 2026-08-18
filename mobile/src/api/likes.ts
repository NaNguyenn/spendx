import { apiDelete, apiPut } from '@/api/client';

/**
 * Thin wrappers around `/expenses/{id}/like` — same shape as expenses.ts and
 * friends.ts. Domain vocabulary (Like) is backend/CONTEXT.md's Like entry:
 * visible ⇒ likeable, both endpoints 204 and idempotent, so there is no
 * response body to type (unlike `apiPost`'s callers, `OkJson` here is
 * `never` — the schema gives both routes only a 204/404 union). No
 * `fetchLikers` wrapper for `GET /expenses/{id}/likes` yet — this ticket has
 * no likers-list UI, and a wrapper nothing calls is dead code.
 */

/** Likes an Expense the caller can see. Liking an already-liked Expense is a no-op. */
export function likeExpense(token: string, expenseId: string): Promise<void> {
  return apiPut('/expenses/{id}/like', undefined, {
    token,
    params: { id: expenseId },
  });
}

/** Unlikes an Expense. Unliking one the caller had not liked is a no-op. */
export function unlikeExpense(token: string, expenseId: string): Promise<void> {
  return apiDelete('/expenses/{id}/like', { token, params: { id: expenseId } });
}
