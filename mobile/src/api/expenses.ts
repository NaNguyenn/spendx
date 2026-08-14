import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  type JsonRequestBody,
  type OkJson,
} from '@/api/client';
import type { components, paths } from '@/api/schema';

/**
 * Thin wrappers around the `/expenses` endpoints — the same shape as the
 * calls already inlined in auth/session-context.tsx, pulled out here
 * because Expenses isn't part of the session's own auth flow and several
 * screens (the list, the create form, the edit sheet) need them. Types are
 * derived from the generated `paths` (ADR-0007), not hand-copied.
 */

export type ExpenseDto = OkJson<paths['/expenses']['get']>[number];
export type CreateExpenseInput = JsonRequestBody<paths['/expenses']['post']>;
export type UpdateExpenseInput = JsonRequestBody<
  paths['/expenses/{id}']['patch']
>;
export type StatisticsDto = OkJson<paths['/expenses/statistics']['get']>;
export type PeriodStatistics = components['schemas']['PeriodStatisticsDto'];
export type CategoryTotal = components['schemas']['CategoryTotalDto'];

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

/**
 * Edits an owner's Expense — description, category, visibility, and
 * expense date only. The Original Amount and its Conversion Snapshot are
 * immutable after logging (backend ADR-0008): the server rejects
 * `originalAmount`/`originalCurrency` outright, so the type can't carry
 * them.
 */
export function updateExpense(
  token: string,
  id: string,
  input: UpdateExpenseInput,
): Promise<ExpenseDto> {
  return apiPatch('/expenses/{id}', input, { token, params: { id } });
}

/** Deletes an owner's Expense outright. */
export function deleteExpense(token: string, id: string): Promise<void> {
  return apiDelete('/expenses/{id}', { token, params: { id } });
}

/**
 * The caller's personal statistics (mobile ticket #7): current ISO week and
 * calendar month totals plus per-Category breakdowns, each against the
 * immediately preceding Period. Owner-scoped over every Visibility, in the
 * owner's Preferred Currency — Period boundaries are server-computed
 * (ADR-0004), never re-derived on the device.
 */
export function fetchStatistics(token: string): Promise<StatisticsDto> {
  return apiGet('/expenses/statistics', { token });
}
