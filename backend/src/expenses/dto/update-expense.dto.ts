import { PartialType } from '@nestjs/swagger';
import { CreateExpenseDto } from './create-expense.dto';

/**
 * `PATCH /expenses/:id` — every field of CreateExpenseDto, each optional.
 * An omitted field means "unchanged", which shifts one meaning from create:
 * omitting `expenseDate` here keeps the stored date rather than resetting it
 * to the logging day. Whatever the edit touches, the Converted Amount is
 * re-derived at the *original logging date's* Daily Rate (ADR-0002) — the
 * edit date never enters the conversion.
 */
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
