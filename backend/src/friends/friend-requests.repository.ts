import { Injectable } from '@nestjs/common';
import type { FriendRequest, User } from '../generated/prisma/client';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { orderedFriendPair } from './friend-pair';

/** A Friend Request row with both parties resolved — what every read returns. */
export type FriendRequestWithParties = FriendRequest & {
  sender: User;
  recipient: User;
};

const WITH_PARTIES = { sender: true, recipient: true } as const;

/**
 * All persistence for the Friend Request model (see backend/CONTEXT.md —
 * Friend Request: "a pending offer of Friendship"). Nothing above this
 * class knows Prisma's query API.
 */
@Injectable()
export class FriendRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `null` when a pending request already exists for this exact
   * (sender, recipient) pair — the unique constraint's P2002, caught here
   * so the service can turn it into a 409 rather than a raw Prisma error.
   */
  async create(
    senderId: string,
    recipientId: string,
  ): Promise<FriendRequestWithParties | null> {
    try {
      return await this.prisma.friendRequest.create({
        data: { senderId, recipientId },
        include: WITH_PARTIES,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }
      throw error;
    }
  }

  /** The pending request between two Users in either direction, if any. */
  findBetween(userIdA: string, userIdB: string): Promise<FriendRequest | null> {
    return this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userIdA, recipientId: userIdB },
          { senderId: userIdB, recipientId: userIdA },
        ],
      },
    });
  }

  /** The caller's pending requests, newest first, in both directions. */
  async findForUser(userId: string): Promise<{
    incoming: FriendRequestWithParties[];
    outgoing: FriendRequestWithParties[];
  }> {
    const [incoming, outgoing] = await Promise.all([
      this.prisma.friendRequest.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        include: WITH_PARTIES,
      }),
      this.prisma.friendRequest.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
        include: WITH_PARTIES,
      }),
    ]);
    return { incoming, outgoing };
  }

  /**
   * Accepts a Friend Request: transactionally deletes it and creates the
   * Friendship (see rules/db-use-transactions.md), so the two writes can
   * never half-apply. Returns the new friend — the sender, from the
   * accepting recipient's point of view — or `null` when the request does
   * not exist or `callerId` is not its recipient (the same 404 either way;
   * the service does not distinguish them, so a probe learns nothing about
   * a request that was never the caller's business).
   */
  async accept(requestId: string, callerId: string): Promise<User | null> {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.friendRequest.findUnique({
        where: { id: requestId },
      });
      if (!found || found.recipientId !== callerId) {
        return null;
      }

      // Both directions, not just the accepted row: the service's
      // check-then-create in `send` leaves a small race window in which two
      // opposite-direction requests can both land. Sweeping the pair here —
      // and upserting the Friendship rather than creating it — makes
      // accepting either of them converge on the same end state instead of
      // tripping the Friendship unique constraint.
      await tx.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: found.senderId, recipientId: found.recipientId },
            { senderId: found.recipientId, recipientId: found.senderId },
          ],
        },
      });

      const [userAId, userBId] = orderedFriendPair(
        found.senderId,
        found.recipientId,
      );
      await tx.friendship.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        update: {},
        create: { userAId, userBId },
      });

      return tx.user.findUniqueOrThrow({ where: { id: found.senderId } });
    });
  }

  /**
   * Declines (called by the recipient) or cancels (called by the sender) —
   * the same operation either way. The authorization check is baked into
   * the `WHERE` clause itself, atomic with the delete, symmetric with
   * ExpensesRepository.deleteForOwner: `true` when a row was removed,
   * `false` when there was no such request or the caller was neither party.
   */
  async deleteForParty(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.friendRequest.deleteMany({
      where: { id, OR: [{ senderId: userId }, { recipientId: userId }] },
    });
    return count > 0;
  }
}
