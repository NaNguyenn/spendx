import { toPublicUser } from '../users/user-view';
import { BlockDto } from './dto/block.dto';
import type { BlockWithBlockedUser } from './blocks.repository';

/** The single place a Block row becomes a response body. */
export function toBlockDto(block: BlockWithBlockedUser): BlockDto {
  return {
    id: block.id,
    blockedUser: toPublicUser(block.blocked),
    createdAt: block.createdAt.toISOString(),
  };
}
