import { InternalServerErrorException } from '@nestjs/common';
import { calendarDateFromDate } from '../domain/calendar-date';
import type { SupportedCurrency } from '../domain/currency';
import { ExpenseDto } from './dto/expense.dto';
import type { ExpenseWithLikeState } from './expenses.repository';

/**
 * The single place an Expense row becomes a response body: the row plus the
 * one Conversion Snapshot entry the reader sees — their Preferred Currency's
 * (ADR-0008). The snapshot itself never crosses the wire.
 *
 * Money fields use `.toFixed(4)`, not `.toString()`: decimal.js's
 * `toString()` strips trailing zeros (`new Decimal('45000.0000').toString()`
 * is `'45000'`), which would make the wire format depend on arithmetic
 * history instead of the column's own fixed scale. `toFixed(4)` always
 * matches the `Decimal(20, 4)` columns exactly, so a client can parse an
 * amount without guessing how many decimal places it has.
 */
export function toExpenseDto(
  expense: ExpenseWithLikeState,
  readerCurrency: SupportedCurrency,
): ExpenseDto {
  const converted = expense.conversions.find(
    (entry) => entry.currency === readerCurrency,
  );
  if (!converted) {
    // Impossible while the all-or-nothing write rule holds (ADR-0008): every
    // persisted Expense has every Supported Currency's entry. A miss is an
    // invariant breach worth a loud 500 — the same shape as the service's
    // vanished-owner check — never a silent fallback.
    throw new InternalServerErrorException(
      `Expense ${expense.id} has no Conversion Snapshot entry for ${readerCurrency}`,
    );
  }

  return {
    id: expense.id,
    description: expense.description,
    originalAmount: expense.originalAmount.toFixed(4),
    originalCurrency: expense.originalCurrency,
    convertedAmount: converted.amount.toFixed(4),
    convertedCurrency: converted.currency,
    category: expense.category,
    visibility: expense.visibility,
    expenseDate: calendarDateFromDate(expense.expenseDate),
    loggedAt: expense.loggedAt.toISOString(),
    likeCount: expense._count.likes,
    likedByViewer: expense.likes.length > 0,
  };
}
