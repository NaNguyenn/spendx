import { Injectable } from '@nestjs/common';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * All persistence for the Like model (see backend/CONTEXT.md — Like).
 * Visibility — whether `userId` may act on `expenseId` at all — is
 * LikesService's job (the one "visible ⇒ likeable" gate), enforced before
 * any of these run; nothing here re-checks it.
 */
@Injectable()
export class LikesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent: upserts on the `@@id([userId, expenseId])` primary key, so
   * liking an already-liked Expense stays a single row rather than racing
   * the constraint.
   */
  async like(userId: string, expenseId: string): Promise<void> {
    await this.prisma.like.upsert({
      where: { userId_expenseId: { userId, expenseId } },
      create: { userId, expenseId },
      update: {},
    });
  }

  /** Idempotent: no error, and no-op, when there was no Like to remove. */
  async unlike(userId: string, expenseId: string): Promise<void> {
    await this.prisma.like.deleteMany({ where: { userId, expenseId } });
  }

  /** The Expense's likers, newest Like first — backs GET /expenses/:id/likes. */
  async findLikers(expenseId: string): Promise<User[]> {
    const rows = await this.prisma.like.findMany({
      where: { expenseId },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    return rows.map((row) => row.user);
  }
}
