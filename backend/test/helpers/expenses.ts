import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';
import type { App } from 'supertest/types';

export interface CreateExpenseBody {
  description: string;
  originalAmount: string;
  originalCurrency: string;
  category: string;
  visibility: string;
  expenseDate?: string;
}

/** A valid create-Expense payload, overridable per call. */
export function validCreateExpenseBody(
  overrides: Partial<CreateExpenseBody> = {},
): CreateExpenseBody {
  return {
    description: 'Coffee with a friend',
    originalAmount: '45000.0000',
    originalCurrency: 'VND',
    category: 'food',
    visibility: 'private',
    ...overrides,
  };
}

/** Logs an Expense through the public API as the bearer of `token`. */
export async function createExpense(
  app: INestApplication<App>,
  token: string,
  overrides: Partial<CreateExpenseBody> = {},
): Promise<{ response: Response; body: CreateExpenseBody }> {
  const body = validCreateExpenseBody(overrides);
  const response = await request(app.getHttpServer())
    .post('/expenses')
    .set('Authorization', `Bearer ${token}`)
    .send(body);
  return { response, body };
}
