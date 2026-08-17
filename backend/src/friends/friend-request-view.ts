import { toPublicUser } from '../users/user-view';
import { FriendRequestDto } from './dto/friend-request.dto';
import type { FriendRequestWithParties } from './friend-requests.repository';

/** The single place a Friend Request row becomes a response body. */
export function toFriendRequestDto(
  request: FriendRequestWithParties,
): FriendRequestDto {
  return {
    id: request.id,
    sender: toPublicUser(request.sender),
    recipient: toPublicUser(request.recipient),
    createdAt: request.createdAt.toISOString(),
  };
}
