import { calendarDateFromDate } from '../domain/calendar-date';
import type { Expense } from '../generated/prisma/client';
import { ExpenseDto } from './dto/expense.dto';

/**
 * The single place an Expense row becomes a response body.
 *
 * Money fields use `.toFixed(4)`, not `.toString()`: decimal.js's
 * `toString()` strips trailing zeros (`new Decimal('45000.0000').toString()`
 * is `'45000'`), which would make the wire format depend on arithmetic
 * history instead of the column's own fixed scale. `toFixed(4)` always
 * matches the `Decimal(20, 4)` columns exactly, so a client can parse an
 * amount without guessing how many decimal places it has.
 */
export function toExpenseDto(expense: Expense): ExpenseDto {
  return {
    id: expense.id,
    description: expense.description,
    originalAmount: expense.originalAmount.toFixed(4),
    originalCurrency: expense.originalCurrency,
    convertedAmount: expense.convertedAmount.toFixed(4),
    convertedCurrency: expense.convertedCurrency,
    category: expense.category,
    visibility: expense.visibility,
    expenseDate: calendarDateFromDate(expense.expenseDate),
    loggedAt: expense.loggedAt.toISOString(),
  };
}
