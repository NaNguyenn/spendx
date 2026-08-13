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
    // Read for the owner's Preferred Currency — the Converted Amount's
    // target. Not an existence check: JwtAuthGuard already resolved
    // `ownerId` to a live User and 401s when it cannot, so a miss here means
    // the account vanished mid-request. That is an invariant breach, not a
    // client error, so it must not surface as a 404 blaming the request.
    const owner = await this.usersRepository.findById(ownerId);
    if (!owner) {
      throw new InternalServerErrorException(
        `Authenticated user ${ownerId} no longer exists`,
      );
    }

    const loggedAt = this.clock.now();
    // Logged At anchors both the Expense Date default and the Daily Rate —
    // the same "logging day" in the fixed app timezone, per ADR-0002 and the
    // issue's Expense Date default (docs/adr/0004).
    const loggingDate = calendarDateInAppTimezone(loggedAt);
    const expenseDate = dto.expenseDate ?? loggingDate;

    const converted = await this.conversionService.convert({
      amount: dto.originalAmount,
      currency: dto.originalCurrency,
      targetCurrency: owner.preferredCurrency,
      date: loggingDate,
    });

    const expense = await this.expensesRepository.create({
      ownerId,
      description: dto.description,
      originalAmount: dto.originalAmount,
      originalCurrency: dto.originalCurrency,
      convertedAmount: converted.amount,
      convertedCurrency: converted.currency,
      category: dto.category,
      visibility: dto.visibility,
      expenseDate: calendarDateToDate(expenseDate),
      loggedAt,
    });

    return toExpenseDto(expense);
  }

  /** The caller's own Expenses (every Visibility), newest logged first. */
  async findAllForOwner(ownerId: string): Promise<ExpenseDto[]> {
    const expenses = await this.expensesRepository.findAllByOwner(ownerId);
    return expenses.map(toExpenseDto);
  }

  /**
   * Edits an owner's Expense. Whatever the edit touches, the Converted
   * Amount is re-derived at the *original logging date's* Daily Rate
   * (ADR-0002) — `loggedAt` is immutable and the edit date never enters the
   * conversion. Re-deriving unconditionally (not only when amount or
   * currency changed) is safe because the Daily Rate table is append-only
   * per (pair, date): the same inputs give the same Converted Amount.
   */
  async update(
    ownerId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseDto> {
    // A stranger's Expense and a nonexistent one are deliberately the same
    // 404 (see findByIdForOwner) — a probe learns nothing about existence.
    const expense = await this.expensesRepository.findByIdForOwner(
      expenseId,
      ownerId,
    );
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    // Same invariant-breach reasoning as create's owner lookup.
    const owner = await this.usersRepository.findById(ownerId);
    if (!owner) {
      throw new InternalServerErrorException(
        `Authenticated user ${ownerId} no longer exists`,
      );
    }

    const originalAmount =
      dto.originalAmount ?? expense.originalAmount.toFixed(4);
    const originalCurrency = dto.originalCurrency ?? expense.originalCurrency;

    const converted = await this.conversionService.convert({
      amount: originalAmount,
      currency: originalCurrency,
      targetCurrency: owner.preferredCurrency,
      date: calendarDateInAppTimezone(expense.loggedAt),
    });

    const updated = await this.expensesRepository.update(expenseId, {
      description: dto.description ?? expense.description,
      originalAmount,
      originalCurrency,
      convertedAmount: converted.amount,
      convertedCurrency: converted.currency,
      category: dto.category ?? expense.category,
      visibility: dto.visibility ?? expense.visibility,
      expenseDate: dto.expenseDate
        ? calendarDateToDate(dto.expenseDate)
        : expense.expenseDate,
    });

    return toExpenseDto(updated);
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
}
