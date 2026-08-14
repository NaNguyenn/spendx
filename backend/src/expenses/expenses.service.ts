import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CLOCK, type Clock } from '../clock/clock';
import { ConversionService } from '../daily-rates/conversion.service';
import {
  calendarDateInAppTimezone,
  calendarDateToDate,
} from '../domain/calendar-date';
import type { SupportedCurrency } from '../domain/currency';
import { UsersRepository } from '../users/users.repository';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseDto } from './dto/expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { toExpenseDto } from './expense-view';
import { ExpensesRepository } from './expenses.repository';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly conversionService: ConversionService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(ownerId: string, dto: CreateExpenseDto): Promise<ExpenseDto> {
    const preferredCurrency = await this.preferredCurrencyOf(ownerId);

    const loggedAt = this.clock.now();
    // Logged At anchors both the Expense Date default and the Conversion
    // Snapshot's Daily Rates — the same "logging day" in the fixed app
    // timezone, per ADR-0002 and ADR-0008.
    const loggingDate = calendarDateInAppTimezone(loggedAt);
    const expenseDate = dto.expenseDate ?? loggingDate;

    // All-or-nothing (ADR-0008): this throws 503 on any uncovered pair, so
    // nothing is persisted unless every entry could be derived.
    const conversions = await this.conversionService.snapshot({
      amount: dto.originalAmount,
      currency: dto.originalCurrency,
      date: loggingDate,
    });

    const expense = await this.expensesRepository.create({
      ownerId,
      description: dto.description,
      originalAmount: dto.originalAmount,
      originalCurrency: dto.originalCurrency,
      conversions,
      category: dto.category,
      visibility: dto.visibility,
      expenseDate: calendarDateToDate(expenseDate),
      loggedAt,
    });

    return toExpenseDto(expense, preferredCurrency);
  }

  /** The caller's own Expenses (every Visibility), newest logged first. */
  async findAllForOwner(ownerId: string): Promise<ExpenseDto[]> {
    const preferredCurrency = await this.preferredCurrencyOf(ownerId);
    const expenses = await this.expensesRepository.findAllByOwner(ownerId);
    return expenses.map((expense) => toExpenseDto(expense, preferredCurrency));
  }

  /**
   * Edits an owner's Expense: description, Category, Visibility, and
   * Expense Date only. The Original Amount and Original Currency are
   * immutable after logging (ADR-0008) — the DTO cannot carry them — so the
   * Conversion Snapshot is never re-derived and no edit ever touches a
   * Daily Rate.
   */
  async update(
    ownerId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseDto> {
    const preferredCurrency = await this.preferredCurrencyOf(ownerId);

    // Owner-scoped in the query itself: a stranger's Expense and a
    // nonexistent one are deliberately the same 404 — a probe learns
    // nothing about existence.
    const updated = await this.expensesRepository.updateForOwner(
      expenseId,
      ownerId,
      {
        description: dto.description,
        category: dto.category,
        visibility: dto.visibility,
        expenseDate: dto.expenseDate
          ? calendarDateToDate(dto.expenseDate)
          : undefined,
      },
    );
    if (!updated) {
      throw new NotFoundException('Expense not found');
    }

    return toExpenseDto(updated, preferredCurrency);
  }

  /** Deletes an owner's Expense outright; 404s exactly like {@link update}. */
  async delete(ownerId: string, expenseId: string): Promise<void> {
    const deleted = await this.expensesRepository.deleteForOwner(
      expenseId,
      ownerId,
    );
    if (!deleted) {
      throw new NotFoundException('Expense not found');
    }
  }

  /**
   * The owner's Preferred Currency — which Conversion Snapshot entry their
   * responses project (ADR-0008). Not an existence check: JwtAuthGuard
   * already resolved `ownerId` to a live User and 401s when it cannot, so a
   * miss here means the account vanished mid-request. That is an invariant
   * breach, not a client error, so it must not surface as a 404 blaming the
   * request.
   */
  private async preferredCurrencyOf(
    ownerId: string,
  ): Promise<SupportedCurrency> {
    const owner = await this.usersRepository.findById(ownerId);
    if (!owner) {
      throw new InternalServerErrorException(
        `Authenticated user ${ownerId} no longer exists`,
      );
    }
    return owner.preferredCurrency;
  }
}
