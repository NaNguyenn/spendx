import { Injectable } from '@nestjs/common';
import type { Category } from '../domain/category';
import type { SupportedCurrency } from '../domain/currency';
import { SHAREABLE_VISIBILITIES } from '../domain/visibility';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** One owner's summed Converted Amount for one Category — see below. */
export interface OwnerCategoryTotal {
  ownerId: string;
  category: Category;
  total: Prisma.Decimal;
}

interface RawOwnerCategoryTotalRow {
  ownerId: string;
  category: Category;
  // Cast to text in the query itself (see below): raw queries have no
  // guaranteed Decimal mapping the way typed Prisma queries do, so this
  // reads back as a string and is parsed into `Prisma.Decimal` here —
  // never a JS float touches a SUM of money.
  total: string;
}

/**
 * Persistence behind the Leaderboard (backend/CONTEXT.md — Leaderboard,
 * Shareable Spend). The visibility-filtered aggregate is raw SQL by
 * prescription (ADR-0005 / docs/adr/0003): the predicate deciding what a
 * viewer may see is the thing under test, so it stays legible as SQL rather
 * than assembled by a query builder. Reads only `expenses` and
 * `expense_conversions` — the frozen Conversion Snapshot — and never
 * `daily_rates` (ADR-0008).
 */
@Injectable()
export class LeaderboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sums every `ownerId`'s Shareable Expenses (backend/CONTEXT.md — Friend-
   * only and Public, never Private — including the viewer's own row per
   * ADR-0003) whose Expense Date falls within `[range.start, range.end]`
   * inclusive, grouped by owner and Category, projected into `currency`'s
   * Conversion Snapshot entry. An owner/Category with no matching Expenses
   * simply has no row — callers zero-fill (see
   * `../expenses/statistics-view.ts#summarizeCategoryTotals`).
   */
  async sumShareableByOwnerAndCategory(
    ownerIds: string[],
    currency: SupportedCurrency,
    range: { start: Date; end: Date },
  ): Promise<OwnerCategoryTotal[]> {
    const rows = await this.prisma.$queryRaw<RawOwnerCategoryTotalRow[]>(
      Prisma.sql`
        SELECT
          e."ownerId" AS "ownerId",
          e."category" AS "category",
          SUM(ec."amount")::text AS "total"
        FROM "expenses" e
        JOIN "expense_conversions" ec ON ec."expenseId" = e."id"
        WHERE e."ownerId" IN (${Prisma.join(ownerIds)})
          AND ec."currency"::text = ${currency}
          AND e."visibility"::text IN (${Prisma.join([...SHAREABLE_VISIBILITIES])})
          AND e."expenseDate" BETWEEN ${range.start} AND ${range.end}
        GROUP BY e."ownerId", e."category"
      `,
    );

    return rows.map((row) => ({
      ownerId: row.ownerId,
      category: row.category,
      total: new Prisma.Decimal(row.total),
    }));
  }
}
