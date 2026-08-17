import { Injectable } from '@nestjs/common';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { orderedFriendPair } from './friend-pair';

/**
 * Persistence for the Friendship model (see backend/CONTEXT.md —
 * Friendship) — all of it except the accept-time create, which lives in
 * FriendRequestsRepository.accept because it must share a transaction with
 * the Friend Request delete. Rows are canonically ordered (userAId <
 * userBId — see schema.prisma); every method here orders its pair before
 * querying so callers never have to reason about which side is which.
 */
@Injectable()
export class FriendshipsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async areFriends(userIdA: string, userIdB: string): Promise<boolean> {
    const [userAId, userBId] = orderedFriendPair(userIdA, userIdB);
    const friendship = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
    return friendship !== null;
  }

  /**
   * The other User of every Friendship `userId` belongs to. Ordering by
   * Username is done here in application code, not the query: `userId` can
   * be stored as either side of a row, so the "other" User has to be
   * resolved per-row first — with the small Friend counts this table sees,
   * that outweighs a conditional `ORDER BY` for a marginal index gain.
   */
  async listFriendsOf(userId: string): Promise<User[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: { userA: true, userB: true },
    });
    const friends = rows.map((row) =>
      row.userAId === userId ? row.userB : row.userA,
    );
    return friends.sort((a, b) => a.username.localeCompare(b.username));
  }

  /** `true` when a Friendship existed between the two and was removed. */
  async deleteBetween(userIdA: string, userIdB: string): Promise<boolean> {
    const [userAId, userBId] = orderedFriendPair(userIdA, userIdB);
    const { count } = await this.prisma.friendship.deleteMany({
      where: { userAId, userBId },
    });
    return count > 0;
  }
}
