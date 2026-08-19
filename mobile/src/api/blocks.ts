import {
  apiDelete,
  apiGet,
  apiPost,
  type JsonRequestBody,
  type OkJson,
} from '@/api/client';
import type { PublicUserDto } from '@/api/friends';
import type { components, paths } from '@/api/schema';

/**
 * Thin wrappers around the `/blocks` endpoints — same shape as friends.ts.
 * Domain vocabulary (Block) is backend/CONTEXT.md's Social graph section:
 * full mutual invisibility, severing any Friendship, with the blocked User
 * never notified.
 */

export type BlockDto = components['schemas']['BlockDto'];
export type BlockedUsersDto = OkJson<paths['/blocks']['get']>;
export type CreateBlockInput = JsonRequestBody<paths['/blocks']['post']>;

/** The caller's blocked list, newest first. */
export function fetchBlockedUsers(token: string): Promise<BlockedUsersDto> {
  return apiGet('/blocks', { token });
}

/**
 * Blocks a User by exact Username (backend/CONTEXT.md's Username — no fuzzy
 * search): severs any Friendship and makes each invisible to the other from
 * this point on, everywhere (feed, leaderboard, profile, likes). The caller
 * surfaces the API's own error message on a rejection: 404 unknown Username
 * (indistinguishable from the target having already blocked the caller), 400
 * blocking yourself, 409 already blocked.
 */
export function createBlock(
  token: string,
  input: CreateBlockInput,
): Promise<BlockDto> {
  return apiPost('/blocks', input, { token });
}

/** Unblocks a User — restores visibility both ways, but not any severed Friendship. */
export function removeBlock(token: string, username: string): Promise<void> {
  return apiDelete('/blocks/{username}', { token, params: { username } });
}

export type { PublicUserDto };
