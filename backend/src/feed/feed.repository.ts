import { Injectable } from '@nestjs/common';
import type { Expense, ExpenseConversion } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { FeedCursor } from './feed-cursor';

/**
 * One Feed row: a Public Expense, its full Conversion Snapshot, and its
 * owner's public identity (Username, Display Name — email is never public).
 */
export type FeedExpense = Expense & {
  conversions: ExpenseConversion[];
  owner: { username: string; displayName: string };
};

/**
 * Persistence behind the Feed (backend/CONTEXT.md — Feed; issue #13): every
 * Public Expense app-wide, newest first by Logged At. Block filtering
 * (backend/CONTEXT.md — Block, issue #15) is not applied here yet — every
 * Public Expense is visible to every caller until that lands.
 */
@Injectable()
export class FeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Up to `take` Public Expenses ordered by `(loggedAt DESC, id DESC)` —
   * uuidv7 ids sort by creation, making `id` a deterministic tiebreak for
   * Expenses logged at the same instant. Strictly after `cursor` when given:
   * `loggedAt < cursor.loggedAt OR (loggedAt = cursor.loggedAt AND id <
   * cursor.id)`, the keyset predicate that keeps page boundaries stable as
   * new Expenses arrive (backed by `@@index([visibility, loggedAt, id])`).
   * Callers decide `take` — see `feed.service.ts`, which fetches one extra
   * row to know whether a `nextCursor` exists.
   */
  findPage(
    cursor: FeedCursor | undefined,
    take: number,
  ): Promise<FeedExpense[]> {
    return this.prisma.expense.findMany({
      where: {
        visibility: 'public',
        ...(cursor
          ? {
              OR: [
                { loggedAt: { lt: cursor.loggedAt } },
                { loggedAt: cursor.loggedAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ loggedAt: 'desc' }, { id: 'desc' }],
      take,
      include: {
        conversions: true,
        owner: { select: { username: true, displayName: true } },
      },
    });
  }
}
