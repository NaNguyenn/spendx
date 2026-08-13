import { Injectable } from '@nestjs/common';
import type { Category } from '../domain/category';
import type { SupportedCurrency } from '../domain/currency';
import type { Visibility } from '../domain/visibility';
import { Prisma, type Expense } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateExpenseData {
  ownerId: string;
  description: string;
  originalAmount: string;
  originalCurrency: SupportedCurrency;
  convertedAmount: Prisma.Decimal;
  convertedCurrency: SupportedCurrency;
  category: Category;
  visibility: Visibility;
  expenseDate: Date;
  loggedAt: Date;
}

/** Everything an edit may change; `ownerId` and `loggedAt` never move. */
export type UpdateExpenseData = Omit<CreateExpenseData, 'ownerId' | 'loggedAt'>;

/**
 * All persistence for the Expense model. Nothing above this class knows
 * Prisma's query API — callers pass and receive domain values.
 */
@Injectable()
export class ExpensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateExpenseData): Promise<Expense> {
    return this.prisma.expense.create({ data });
  }

  /** The owner's own Expenses (every Visibility), newest logged first. */
  findAllByOwner(ownerId: string): Promise<Expense[]> {
    return this.prisma.expense.findMany({
      where: { ownerId },
      orderBy: { loggedAt: 'desc' },
    });
  }

  /**
   * The Expense only if `ownerId` owns it. A miss and a stranger's probe
   * are the same `null` here, so callers can't accidentally distinguish
   * them either.
   */
  findByIdForOwner(id: string, ownerId: string): Promise<Expense | null> {
    return this.prisma.expense.findFirst({ where: { id, ownerId } });
  }

  /**
   * Updates only if `ownerId` owns the row — ownership enforced inside the
   * one query, symmetric with {@link deleteForOwner}, not delegated to a
   * prior read. `null` when the row vanished or was never theirs, so a
   * concurrent delete surfaces as the caller's 404 rather than a 500.
   */
  async updateForOwner(
    id: string,
    ownerId: string,
    data: UpdateExpenseData,
  ): Promise<Expense | null> {
    try {
      return await this.prisma.expense.update({
        where: { id, ownerId },
        data,
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
