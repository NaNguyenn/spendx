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

// Routes without a GET/POST are typed `get?: never`/`post?: never`, so
// requiring an object here narrows the union to exactly the ones that have one.
type PathsWithGet = {
  [P in keyof paths]: paths[P] extends { get: object } ? P : never;
}[keyof paths];

type PathsWithPost = {
  [P in keyof paths]: paths[P] extends { post: object } ? P : never;
}[keyof paths];

type PathsWithPatch = {
  [P in keyof paths]: paths[P] extends { patch: object } ? P : never;
}[keyof paths];

// Success is 200 for GETs, 201 for the POSTs that create something (sign-up) —
// checked as a union so both kinds of endpoint share one helper. Exported so
// callers can name a route's response/request shape without hand-declaring a
// second copy of it (see docs/adr/0007).
export type OkJson<T> = T extends { responses: infer R }
  ? R extends { 200: { content: { 'application/json': infer Body200 } } }
    ? Body200
    : R extends { 201: { content: { 'application/json': infer Body201 } } }
      ? Body201
      : never
  : never;

export type JsonRequestBody<T> = T extends {
  requestBody: { content: { 'application/json': infer Body } };
}
  ? Body
  : never;

export interface RequestOptions {
  /** Bearer token for authenticated endpoints. */
  token?: string;
  signal?: AbortSignal;
}

export async function apiGet<P extends PathsWithGet>(
  path: P,
  options: RequestOptions = {},
): Promise<OkJson<paths[P]['get']>> {
  return request(path as string, { method: 'GET' }, options);
}

export async function apiPost<P extends PathsWithPost>(
  path: P,
  body: JsonRequestBody<paths[P]['post']>,
  options: RequestOptions = {},
): Promise<OkJson<paths[P]['post']>> {
  return request(
    path as string,
    { method: 'POST', body: JSON.stringify(body) },
    options,
  );
}

export async function apiPatch<P extends PathsWithPatch>(
  path: P,
  body: JsonRequestBody<paths[P]['patch']>,
  options: RequestOptions = {},
): Promise<OkJson<paths[P]['patch']>> {
  return request(
    path as string,
    { method: 'PATCH', body: JSON.stringify(body) },
    options,
  );
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
