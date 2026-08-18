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
 * Adds the Like aggregate `toExpenseDto` needs for `likeCount` and
 * `likedByViewer` (backend/CONTEXT.md — Like): the total Like count, plus
 * `likes` pre-filtered to exactly the requesting viewer's row, if any.
 * `@@id([userId, expenseId])` guarantees `likes` never has more than one
 * entry — `toExpenseDto` only checks whether it's empty. A freshly created
 * Expense has no Likes yet, so `create` returns `ExpenseWithConversions`
 * only; its caller (ExpensesService.create) supplies `{ likes: 0 }`/`[]`
 * directly rather than querying for a Like that cannot exist.
 */
export type ExpenseWithLikeState = ExpenseWithConversions & {
  _count: { likes: number };
  likes: { userId: string }[];
};

/** The `include` shared by every read that needs `likeCount`/`likedByViewer`. */
function likeStateInclude(viewerId: string) {
  return {
    _count: { select: { likes: true } },
    likes: { where: { userId: viewerId }, select: { userId: true } },
  } as const;
}

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

/** An inclusive Expense Date filter; either bound may be omitted. */
export interface ExpenseDateRangeFilter {
  start?: Date;
  end?: Date;
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

  /**
   * The owner's own Expenses (every Visibility), newest logged first. The
   * viewer is always the owner here, so the Like state is filtered to
   * `ownerId` too — an owner can Like their own Expense (backend/CONTEXT.md
   * — Like).
   */
  findAllByOwner(ownerId: string): Promise<ExpenseWithLikeState[]> {
    return this.prisma.expense.findMany({
      where: { ownerId },
      orderBy: { loggedAt: 'desc' },
      include: { conversions: true, ...likeStateInclude(ownerId) },
    });
  }

  /**
   * An owner's Shareable Expenses (backend/CONTEXT.md — Shareable Spend):
   * Friend-only and Public only, never Private. Newest logged first, same
   * ordering as {@link findAllByOwner} — what GET /users/:username/expenses
   * (issue #11, src/friends) reads once a Friendship is confirmed.
   *
   * `range` optionally narrows to Expense Date (never Logged At) within
   * `[start, end]`; each bound is independent (issue #12's Leaderboard
   * drill-down browses a specific Period this way).
   *
   * `readerId` is the viewer — distinct from `ownerId` here, unlike
   * {@link findAllByOwner} — so the Like state is filtered to the reader's
   * own Like, not the owner's.
   */
  findShareableByOwner(
    ownerId: string,
    readerId: string,
    range?: ExpenseDateRangeFilter,
  ): Promise<ExpenseWithLikeState[]> {
    return this.prisma.expense.findMany({
      where: {
        ownerId,
        visibility: { in: [...SHAREABLE_VISIBILITIES] },
        ...(range?.start || range?.end
          ? { expenseDate: { gte: range.start, lte: range.end } }
          : {}),
      },
      orderBy: { loggedAt: 'desc' },
      include: { conversions: true, ...likeStateInclude(readerId) },
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
  ): Promise<ExpenseWithLikeState | null> {
    try {
      return await this.prisma.expense.update({
        where: { id, ownerId },
        data,
        include: { conversions: true, ...likeStateInclude(ownerId) },
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

  /**
   * `ownerId` and Visibility only — never the full row — the lean shape
   * LikesService's Visibility gate needs (backend/CONTEXT.md — Like:
   * "visible ⇒ likeable"). `null` for a nonexistent Expense.
   */
  findOwnerAndVisibility(
    id: string,
  ): Promise<{ ownerId: string; visibility: Visibility } | null> {
    return this.prisma.expense.findUnique({
      where: { id },
      select: { ownerId: true, visibility: true },
    });
  }
}
