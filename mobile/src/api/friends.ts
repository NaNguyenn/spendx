import {
  apiDelete,
  apiGet,
  apiPost,
  type JsonRequestBody,
  type OkJson,
} from '@/api/client';
import type { ExpenseDto } from '@/api/expenses';
import type { components, paths } from '@/api/schema';

/**
 * Thin wrappers around the `/friend-requests`, `/friends`, and
 * `/users/{username}/expenses` endpoints — same shape as expenses.ts.
 * Domain vocabulary (Friend Request, Friendship, Username) is
 * backend/CONTEXT.md's Social graph section.
 */

export type PublicUserDto = components['schemas']['PublicUserDto'];
export type FriendRequestDto = components['schemas']['FriendRequestDto'];
export type FriendRequestsDto = OkJson<paths['/friend-requests']['get']>;
export type CreateFriendRequestInput = JsonRequestBody<
  paths['/friend-requests']['post']
>;

/** The caller's pending Friend Requests, both directions, each newest first. */
export function fetchFriendRequests(token: string): Promise<FriendRequestsDto> {
  return apiGet('/friend-requests', { token });
}

/**
 * Sends a Friend Request by exact Username (backend/CONTEXT.md's Username —
 * no fuzzy search). The caller surfaces the API's own error message on a
 * rejection: 404 unknown Username, 400 sending to yourself, 409 already
 * Friends or already pending in either direction.
 */
export function sendFriendRequest(
  token: string,
  input: CreateFriendRequestInput,
): Promise<FriendRequestDto> {
  return apiPost('/friend-requests', input, { token });
}

/** Accepts an incoming Friend Request (recipient only), creating the Friendship. */
export function acceptFriendRequest(
  token: string,
  id: string,
): Promise<PublicUserDto> {
  return apiPost('/friend-requests/{id}/accept', undefined, {
    token,
    params: { id },
  });
}

/**
 * Declines an incoming Friend Request or cancels an outgoing one — the same
 * endpoint, role checked server-side, hence the one wrapper for both.
 */
export function removeFriendRequest(token: string, id: string): Promise<void> {
  return apiDelete('/friend-requests/{id}', { token, params: { id } });
}

/** Ends a Friendship (either side may unfriend). */
export function unfriend(token: string, username: string): Promise<void> {
  return apiDelete('/friends/{username}', { token, params: { username } });
}

export interface FetchFriendExpensesRange {
  /** Only Expenses on or after this Expense Date (YYYY-MM-DD), inclusive. */
  start?: string;
  /** Only Expenses on or before this Expense Date (YYYY-MM-DD), inclusive. */
  end?: string;
}

/**
 * A Friend's Shareable Expenses (Friend-only + Public, never Private),
 * converted into the caller's own Preferred Currency. `range` narrows to a
 * Period — how the Leaderboard's friend drill-down (mobile ticket #12,
 * app/friend/[username].tsx) shows only the Period a Rank Row was expanded
 * for; omitted, every Shareable Expense comes back.
 */
export function fetchFriendExpenses(
  token: string,
  username: string,
  range?: FetchFriendExpensesRange,
): Promise<ExpenseDto[]> {
  return apiGet('/users/{username}/expenses', {
    token,
    params: { username },
    query: { start: range?.start, end: range?.end },
  });
}
