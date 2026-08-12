import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';
import type { App } from 'supertest/types';

export interface SignUpBody {
  email: string;
  password: string;
  username: string;
  displayName: string;
  preferredCurrency: string;
  locale: string;
}

let counter = 0;

/** A valid sign-up payload, unique per call unless a field is overridden. */
export function validSignUpBody(
  overrides: Partial<SignUpBody> = {},
): SignUpBody {
  counter += 1;
  return {
    email: `user${counter}@example.com`,
    password: 'correct horse battery',
    username: `user${counter}`,
    displayName: `User ${counter}`,
    preferredCurrency: 'USD',
    locale: 'en',
    ...overrides,
  };
}

/** Signs a fresh account up through the public API. */
export async function signUp(
  app: INestApplication<App>,
  overrides: Partial<SignUpBody> = {},
): Promise<{ response: Response; body: SignUpBody }> {
  const body = validSignUpBody(overrides);
  const response = await request(app.getHttpServer())
    .post('/auth/sign-up')
    .send(body);
  return { response, body };
}
