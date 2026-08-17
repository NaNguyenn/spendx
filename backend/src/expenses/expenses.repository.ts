import { Injectable } from '@nestjs/common';
import type { ConversionSnapshotEntry } from '../daily-rates/conversion.service';
import type { Category } from '../domain/category';
import type { SupportedCurrency } from '../domain/currency';
import type { Visibility } from '../domain/visibility';
import { SHAREABLE_VISIBILITIES } from '../domain/visibility';
import {
  Prisma,
  type Expense,
  type ExpenseConversion,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** An Expense row with its full Conversion Snapshot — what every read returns. */
export type ExpenseWithConversions = Expense & {
  conversions: ExpenseConversion[];
};

/**
 * One Expense's Category and its Conversion Snapshot entry for a single
 * currency — see {@link ExpensesRepository.findCategoryAmountsForOwnerInRange}.
 * `amount` is `null` only when that entry is missing, which the all-or-
 * nothing write rule (ADR-0008) makes an invariant breach, not a normal
 * case; callers must fail loudly on it rather than under-total silently.
 */
export interface ExpenseCategoryAmount {
  expenseId: string;
  category: Category;
  amount: Prisma.Decimal | null;
}

export interface CreateExpenseData {
  ownerId: string;
  description: string;
  originalAmount: string;
  originalCurrency: SupportedCurrency;
  /** The full Conversion Snapshot — one entry per Supported Currency. */
  conversions: ConversionSnapshotEntry[];
  category: Category;
  visibility: Visibility;
  expenseDate: Date;
  loggedAt: Date;
}

/**
 * Everything an edit may change — nothing else. The Original Amount and
 * Original Currency are immutable after logging (ADR-0008), and with them
 * the Conversion Snapshot; `ownerId` and `loggedAt` never move. An
 * `undefined` field means "unchanged", which Prisma honors by omission.
 */
export interface UpdateExpenseData {
  description?: string;
  category?: Category;
  visibility?: Visibility;
  expenseDate?: Date;
}

/**
 * All persistence for the Expense model. Nothing above this class knows
 * Prisma's query API — callers pass and receive domain values.
 */
@Injectable()
export class ExpensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists the Expense and its Conversion Snapshot as one nested create —
   * a single transaction, so the all-or-nothing rule (ADR-0008) holds even
   * against a crash between the two tables.
   */
  create({
    conversions,
    ...data
  }: CreateExpenseData): Promise<ExpenseWithConversions> {
    return this.prisma.expense.create({
      data: { ...data, conversions: { create: conversions } },
      include: { conversions: true },
    });
  }

  /** The owner's own Expenses (every Visibility), newest logged first. */
  findAllByOwner(ownerId: string): Promise<ExpenseWithConversions[]> {
    return this.prisma.expense.findMany({
      where: { ownerId },
      orderBy: { loggedAt: 'desc' },
      include: { conversions: true },
    });
  }

  /**
   * An owner's Shareable Expenses (backend/CONTEXT.md — Shareable Spend):
   * Friend-only and Public only, never Private. Newest logged first, same
   * ordering as {@link findAllByOwner} — what GET /users/:username/expenses
   * (issue #11, src/friends) reads once a Friendship is confirmed.
   */
  findShareableByOwner(ownerId: string): Promise<ExpenseWithConversions[]> {
    return this.prisma.expense.findMany({
      where: { ownerId, visibility: { in: [...SHAREABLE_VISIBILITIES] } },
      orderBy: { loggedAt: 'desc' },
      include: { conversions: true },
    });
  }

  /**
   * Every owner's Expense (every Visibility — ADR-0003) whose Expense Date
   * falls within `[range.start, range.end]` inclusive, narrowed to its
   * Category and its Conversion Snapshot entry for `currency` — the shape
   * personal statistics (issue #7, `GET /expenses/statistics`) aggregates
   * from. Grouping is by Expense Date, never Logged At.
   */
  async findCategoryAmountsForOwnerInRange(
    ownerId: string,
    currency: SupportedCurrency,
    range: { start: Date; end: Date },
  ): Promise<ExpenseCategoryAmount[]> {
    const rows = await this.prisma.expense.findMany({
      where: {
        ownerId,
        expenseDate: { gte: range.start, lte: range.end },
      },
      select: {
        id: true,
        category: true,
        conversions: { where: { currency }, select: { amount: true } },
      },
    });
    return rows.map((row) => ({
      expenseId: row.id,
      category: row.category,
      amount: row.conversions[0]?.amount ?? null,
    }));
  }

  /**
   * Updates only if `ownerId` owns the row — ownership enforced inside the
   * one query, symmetric with {@link deleteForOwner}, not delegated to a
   * prior read. `null` when the row does not exist or was never theirs, so
   * a stranger's probe surfaces as the caller's 404 rather than a 500.
   */
  async updateForOwner(
    id: string,
    ownerId: string,
    data: UpdateExpenseData,
  ): Promise<ExpenseWithConversions | null> {
    try {
      return await this.prisma.expense.update({
        where: { id, ownerId },
        data,
        include: { conversions: true },
      });
    } catch (error) {
      // P2025: no row matched the filter — the not-found this method's
      // contract turns into `null` instead of leaking a Prisma error.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null;
      }
      throw error;
    }
  }

  /** True when a row was deleted; false when `ownerId` had no such Expense. */
  async deleteForOwner(id: string, ownerId: string): Promise<boolean> {
    const { count } = await this.prisma.expense.deleteMany({
      where: { id, ownerId },
    });
    return count > 0;
  }
}
