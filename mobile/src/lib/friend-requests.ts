import type { FriendRequestDto, PublicUserDto } from '@/api/friends';

/**
 * Which side of `FriendRequestsDto` a request came from — mirrors the two
 * arrays the API groups them into (backend/CONTEXT.md's Friend Request).
 */
export type FriendRequestDirection = 'incoming' | 'outgoing';

/**
 * The User on the *other* side of a Friend Request from the caller's point
 * of view: the sender for an incoming request (they reached out to the
 * caller), the recipient for an outgoing one (the caller reached out to
 * them). Pulled out as its own pure function — rather than inlined per row
 * — because getting the direction backwards would silently show the
 * caller's own name instead of the other party's.
 */
export function otherParty(
  request: FriendRequestDto,
  direction: FriendRequestDirection,
): PublicUserDto {
  return direction === 'incoming' ? request.sender : request.recipient;
}
