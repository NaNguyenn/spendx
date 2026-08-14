import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateExpenseDto } from './create-expense.dto';

/**
 * `PATCH /expenses/:id` — the editable fields of CreateExpenseDto, each
 * optional. An omitted field means "unchanged", which shifts one meaning
 * from create: omitting `expenseDate` here keeps the stored date rather
 * than resetting it to the logging day.
 *
 * `originalAmount` and `originalCurrency` are deliberately absent: the
 * Original Amount is immutable after logging (ADR-0008) — fixing it means
 * deleting the Expense and logging a new one — so the global whitelist
 * rejects either field with a 400, and no edit ever re-derives the
 * Conversion Snapshot.
 */
export class UpdateExpenseDto extends PartialType(
  OmitType(CreateExpenseDto, ['originalAmount', 'originalCurrency'] as const),
) {}
