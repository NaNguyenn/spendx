import {
  apiGet,
  apiPost,
  type JsonRequestBody,
  type OkJson,
} from '@/api/client';
import type { paths } from '@/api/schema';

/**
 * Thin wrappers around `POST /expenses` and `GET /expenses` — the same shape
 * as the calls already inlined in auth/session-context.tsx, pulled out here
 * because Expenses isn't part of the session's own auth flow and two
 * screens (the list, the create form) both need them. Types are derived
 * from the generated `paths` (ADR-0007), not hand-copied.
 */

export type ExpenseDto = OkJson<paths['/expenses']['get']>[number];
export type CreateExpenseInput = JsonRequestBody<paths['/expenses']['post']>;

/** The caller's own Expenses, every Visibility, newest logged first. */
export function fetchExpenses(token: string): Promise<ExpenseDto[]> {
  return apiGet('/expenses', { token });
}

/** Logs an Expense; the response is the persisted row, Converted Amount included. */
export function createExpense(
  token: string,
  input: CreateExpenseInput,
): Promise<ExpenseDto> {
  return apiPost('/expenses', input, { token });
}
