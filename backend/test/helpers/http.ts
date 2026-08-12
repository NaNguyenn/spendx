import type { Response } from 'supertest';

/**
 * Typed access to a JSON response body.
 *
 * supertest types `Response#body` as `any`, so every property read off it
 * trips `no-unsafe-member-access`. These narrow it once at the point of use
 * instead of asserting `any` all over the specs.
 */
export interface AuthResponseBody {
  accessToken: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    preferredCurrency: string;
    locale: string;
    createdAt: string;
  };
}

export function authBody(response: Response): AuthResponseBody {
  return response.body as AuthResponseBody;
}

export interface PublicUserBody {
  id: string;
  username: string;
  displayName: string;
}

export function publicUserBody(response: Response): PublicUserBody {
  return response.body as PublicUserBody;
}

export type PrivateUserBody = AuthResponseBody['user'];

export function privateUserBody(response: Response): PrivateUserBody {
  return response.body as PrivateUserBody;
}

// `expect.any(String)` types as `any` in @types/jest, which trips
// no-unsafe-assignment wherever it's embedded in an object literal. These
// check the same invariants without that.
export function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0;
}

export function isIsoTimestamp(value: unknown): boolean {
  return typeof value === 'string' && new Date(value).toISOString() === value;
}

interface ErrorBody {
  message: string | string[];
}

/** Nest's default validation/error message, joined into one searchable string. */
export function errorMessage(response: Response): string {
  const { message } = response.body as ErrorBody;
  return Array.isArray(message) ? message.join(' ') : message;
}
