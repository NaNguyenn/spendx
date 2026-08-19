import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PublicUserDto } from '../users/dto/public-user.dto';
import { toPublicUser } from '../users/user-view';
import { toBlockDto } from './block-view';
import { BlocksRepository } from './blocks.repository';
import { BlockDto } from './dto/block.dto';

@Injectable()
export class BlocksService {
  constructor(private readonly blocksRepository: BlocksRepository) {}

  /**
   * Blocks a User by Username (backend/CONTEXT.md — Block): full mutual
   * invisibility, initiated by the caller. Severs any existing Friendship
   * and deletes any pending Friend Request between the two, both
   * directions, in one transaction (BlocksRepository.create).
   *
   * Order of checks matters for what a probe can learn: the reverse
   * direction (the target already blocked the caller) is checked *before*
   * existence is otherwise assumed settled, and 404s exactly like an
   * unknown Username — the caller must not be able to tell "this Username
   * does not exist" apart from "this User has blocked you" (backend/
   * CONTEXT.md — Block: no signal beyond content absence). Only the
   * caller's *own* already-blocked case is a 409: the caller already knows
   * that fact, so confirming it leaks nothing.
   */
  async block(blockerId: string, usernameRaw: string): Promise<BlockDto> {
    const target = await this.blocksRepository.findUserByUsername(
      usernameRaw.toLowerCase(),
    );
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.id === blockerId) {
      throw new BadRequestException('Cannot Block yourself');
    }

    const blockedByTarget = await this.blocksRepository.findDirectional(
      target.id,
      blockerId,
    );
    if (blockedByTarget) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.blocksRepository.findDirectional(
      blockerId,
      target.id,
    );
    if (existing) {
      throw new ConflictException('Already blocked');
    }

    const block = await this.blocksRepository.create(blockerId, target.id);
    return toBlockDto(block);
  }

  /** The caller's own blocked list, PublicUserDto-shaped, newest first. */
  async listBlocked(blockerId: string): Promise<PublicUserDto[]> {
    const users = await this.blocksRepository.listBlockedBy(blockerId);
    return users.map(toPublicUser);
  }

  /**
   * Unblocks by Username — only the original blocker may. Restores
   * visibility but does not restore any Friendship the Block severed
   * (backend/CONTEXT.md — Block; the caller has to send a fresh Friend
   * Request). 404 when there is no such Block, same as Friendships.unfriend.
   */
  async unblock(blockerId: string, usernameRaw: string): Promise<void> {
    const target = await this.blocksRepository.findUserByUsername(
      usernameRaw.toLowerCase(),
    );
    if (!target) {
      throw new NotFoundException('Block not found');
    }

    const deleted = await this.blocksRepository.deleteDirectional(
      blockerId,
      target.id,
    );
    if (!deleted) {
      throw new NotFoundException('Block not found');
    }
  }

  /**
   * The filter seam every other module's query surface consumes
   * (backend/CONTEXT.md — Block: "applied as a filter before all queries") —
   * the set of User ids invisible to `viewerId`, both directions.
   */
  invisibleUserIdsFor(viewerId: string): Promise<string[]> {
    return this.blocksRepository.invisibleUserIdsFor(viewerId);
  }

  /** The pairwise form of the same filter, for a single-User check. */
  isBlockedEitherDirection(userIdA: string, userIdB: string): Promise<boolean> {
    return this.blocksRepository.isBlockedEitherDirection(userIdA, userIdB);
  }
}
