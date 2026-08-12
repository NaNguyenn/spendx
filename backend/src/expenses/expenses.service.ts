import {
  Inject,
  Injectable,
  InternalServerErrorException,
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
}
