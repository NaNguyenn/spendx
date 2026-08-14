import { InternalServerErrorException } from '@nestjs/common';
import { CATEGORIES, type Category } from '../domain/category';
import type { SupportedCurrency } from '../domain/currency';
import { Prisma } from '../generated/prisma/client';
import type { CategoryTotalDto } from './dto/category-total.dto';
import type { ExpenseCategoryAmount } from './expenses.repository';

type CategoryTotals = Record<Category, Prisma.Decimal>;

function zeroTotals(): CategoryTotals {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, new Prisma.Decimal(0)]),
  ) as CategoryTotals;
}

export interface PeriodTotals {
  /** The Period's grand total, `.toFixed(4)`. */
  total: string;
  /**
   * Every Category (backend/CONTEXT.md), including zero totals, sorted by
   * total descending; ties broken by the canonical CATEGORIES order.
   */
  categories: CategoryTotalDto[];
}

/**
 * Sums a range of Expenses' Conversion Snapshot entries into one total per
 * Category, plus the Period's grand total — the shape `PeriodStatisticsDto`
 * is built from (see `../expenses.service.ts#statistics`). All arithmetic is
 * `Prisma.Decimal`, matching `ConversionService` and `expense-view.ts`: money
 * never touches a JS float.
 */
export function summarizeCategoryTotals(
  entries: ExpenseCategoryAmount[],
  ownerId: string,
  currency: SupportedCurrency,
): PeriodTotals {
  const totals = zeroTotals();

  for (const entry of entries) {
    if (entry.amount === null) {
      // Impossible while the all-or-nothing write rule holds (ADR-0008):
      // every persisted Expense has every Supported Currency's entry. A
      // miss is an invariant breach worth a loud 500 — the same shape as
      // `expense-view.ts`'s check — never a silent under-total.
      throw new InternalServerErrorException(
        `Expense ${entry.expenseId} (owner ${ownerId}) has no Conversion ` +
          `Snapshot entry for ${currency}`,
      );
    }
    totals[entry.category] = totals[entry.category].plus(entry.amount);
  }

  // Built from CATEGORIES' own order, then sorted total-descending with a
  // stable sort (guaranteed by the spec since ES2019): equal totals keep
  // their CATEGORIES-order relative position, which is exactly "ties broken
  // by the canonical Category order".
  const byCategory = CATEGORIES.map((category) => ({
    category,
    amount: totals[category],
  })).sort((a, b) => b.amount.comparedTo(a.amount));

  const total = byCategory
    .reduce((sum, { amount }) => sum.plus(amount), new Prisma.Decimal(0))
    .toFixed(4);

  return {
    total,
    categories: byCategory.map(({ category, amount }) => ({
      category,
      total: amount.toFixed(4),
    })),
  };
}
