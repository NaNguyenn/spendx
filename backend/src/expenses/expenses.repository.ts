import { Injectable } from '@nestjs/common';
import type { Category } from '../domain/category';
import type { SupportedCurrency } from '../domain/currency';
import type { Visibility } from '../domain/visibility';
import type { Expense, Prisma } from '../generated/prisma/client';
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
}
