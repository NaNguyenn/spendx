import { API_BASE_URL } from './base-url';
import type { paths } from './schema';

/**
 * The only hand-written runtime code in the API layer. Types come from
 * openapi-typescript (`npm run api:types` in backend/); nothing that executes
 * is generated — see docs/adr/0007.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API request failed with ${status}`);
    this.name = 'ApiError';
  }
}

// Routes without a GET are typed `get?: never`, so requiring an object here
// narrows the union to exactly the ones that have one.
type PathsWithGet = {
  [P in keyof paths]: paths[P] extends { get: object } ? P : never;
}[keyof paths];

type OkJson<T> = T extends {
  responses: { 200: { content: { 'application/json': infer Body } } };
}
  ? Body
  : never;

export interface RequestOptions {
  /** Bearer token for authenticated endpoints (sessions arrive with #2). */
  token?: string;
  signal?: AbortSignal;
}

export async function apiGet<P extends PathsWithGet>(
  path: P,
  options: RequestOptions = {},
): Promise<OkJson<paths[P]['get']>> {
  return request(path as string, { method: 'GET' }, options);
}

async function request<T>(
  path: string,
  init: RequestInit,
  { token, signal }: RequestOptions,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    signal,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  const body: unknown = await parseJson(response);

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  return body as T;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
