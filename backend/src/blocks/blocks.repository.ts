import { Injectable } from '@nestjs/common';
import { orderedFriendPair } from '../friends/friend-pair';
import type { Block, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** A Block row with the blocked User resolved — what {@link BlocksRepository.create} and list reads return. */
export type BlockWithBlockedUser = Block & { blocked: User };

/**
 * All persistence for the Block model (see backend/CONTEXT.md — Block).
 * Nothing above this class knows Prisma's query API.
 *
 * Deliberately does not depend on UsersModule for its own Username lookup —
 * see {@link findUserByUsername}'s doc comment — which keeps BlocksModule a
 * leaf every visibility-gated module (Users, Friends, Expenses, Feed,
 * Leaderboard, Likes) can import without a circular module dependency (see
 * rules/arch-avoid-circular-deps.md): several of those modules need Blocks'
 * filter, and Users specifically would otherwise need to import Blocks while
 * Blocks imported Users back.
 */
@Injectable()
export class BlocksRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves a Username to its User row for `create`/`unblock`. A narrow,
   * self-contained duplicate of UsersRepository.findByUsername's one-line
   * query, not a call to UsersRepository — see the class doc comment for
   * why.
   */
  findUserByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  /** The Block from `blockerId` to `blockedId`, this exact direction only. */
  findDirectional(blockerId: string, blockedId: string): Promise<Block | null> {
    return this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
  }

  /**
   * Creates the Block and, in the same transaction, severs any Friendship
   * and deletes any pending Friend Request between the pair, both
   * directions (backend/CONTEXT.md — Block: "any existing Friendship is
   * severed"). Touches the Friendship and Friend Request tables directly
   * rather than through FriendshipsRepository/FriendRequestsRepository — the
   * same precedent as FriendRequestsRepository.accept touching Friendship
   * directly (see friends/friend-requests.repository.ts): a cross-table
   * write that must not half-apply cannot be composed from two repositories
   * each opening their own transaction.
   */
  async create(
    blockerId: string,
    blockedId: string,
  ): Promise<BlockWithBlockedUser> {
    return this.prisma.$transaction(async (tx) => {
      const block = await tx.block.create({
        data: { blockerId, blockedId },
        include: { blocked: true },
      });

      const [userAId, userBId] = orderedFriendPair(blockerId, blockedId);
      await tx.friendship.deleteMany({ where: { userAId, userBId } });

      await tx.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: blockerId, recipientId: blockedId },
            { senderId: blockedId, recipientId: blockerId },
          ],
        },
      });

      return block;
    });
  }

  /** The caller's own blocked list, newest first. */
  async listBlockedBy(blockerId: string): Promise<User[]> {
    const rows = await this.prisma.block.findMany({
      where: { blockerId },
      orderBy: { createdAt: 'desc' },
      include: { blocked: true },
    });
    return rows.map((row) => row.blocked);
  }

  /** `true` when a Block from `blockerId` to `blockedId` existed and was removed. */
  async deleteDirectional(
    blockerId: string,
    blockedId: string,
  ): Promise<boolean> {
    const { count } = await this.prisma.block.deleteMany({
      where: { blockerId, blockedId },
    });
    return count > 0;
  }

  /**
   * The set of User ids invisible to `viewerId` (backend/CONTEXT.md — Block:
   * "neither sees the other's content anywhere ... applied as a filter
   * before all queries"): every User `viewerId` blocked, plus every User who
   * blocked `viewerId`. The one seam every other module's query surface
   * filters through instead of duplicating the OR-both-directions rule —
   * see rules/arch-module-sharing.md.
   */
  async invisibleUserIdsFor(viewerId: string): Promise<string[]> {
    const rows = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
    });
    const ids = new Set<string>();
    for (const row of rows) {
      ids.add(row.blockerId === viewerId ? row.blockedId : row.blockerId);
    }
    return [...ids];
  }

  /** `true` when either User has blocked the other, in either direction. */
  async isBlockedEitherDirection(
    userIdA: string,
    userIdB: string,
  ): Promise<boolean> {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userIdA, blockedId: userIdB },
          { blockerId: userIdB, blockedId: userIdA },
        ],
      },
      select: { id: true },
    });
    return block !== null;
  }
}
