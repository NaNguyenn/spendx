import { Injectable } from '@nestjs/common';
import type { ConversionSnapshotEntry } from '../daily-rates/conversion.service';
import type { Category } from '../domain/category';
import type { SupportedCurrency } from '../domain/currency';
import type { Visibility } from '../domain/visibility';
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
