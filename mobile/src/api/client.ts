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
    /**
     * Seconds until a caller may retry, parsed from a 429's `Retry-After`
     * header — Email Verification's resend cooldown (backend/CONTEXT.md's
     * One-Time Code, issue #20) is the first caller that needs it.
     * `undefined` for any other status, or when the header is missing or
     * not a positive integer — callers that care fall back to their own
     * default rather than trusting a value this couldn't parse.
     */
    readonly retryAfterSeconds?: number,
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

type PathsWithPut = {
  [P in keyof paths]: paths[P] extends { put: object } ? P : never;
}[keyof paths];

type PathsWithDelete = {
  [P in keyof paths]: paths[P] extends { delete: object } ? P : never;
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
  /**
   * Values for the path's `{placeholder}` segments (`/expenses/{id}` +
   * `{ id }`), substituted URL-encoded. The typed path stays the literal
   * schema key so it keeps matching `paths` — substitution is a runtime
   * concern only.
   */
  params?: Record<string, string>;
  /**
   * `?key=value` query string entries — `undefined` values are omitted
   * rather than sent as the literal text "undefined", so a caller can pass
   * every optional query param through unconditionally (e.g.
   * `fetchFriendExpenses`'s `start`/`end`) without an `if` per param.
   */
  query?: Record<string, string | undefined>;
  signal?: AbortSignal;
}

export async function apiGet<P extends PathsWithGet>(
  path: P,
  options: RequestOptions = {},
): Promise<OkJson<paths[P]['get']>> {
  return request(path as string, { method: 'GET' }, options);
}

// A schema POST with no `requestBody` (e.g. accept-a-Friend-Request — the
// route's only input is the `{id}` path param) makes `JsonRequestBody`
// resolve to `never`, which no runtime value can satisfy. Widening the
// parameter to `undefined` in exactly that case is what lets a bodyless POST
// still be called through this one helper instead of a second one.
type PostBody<P extends PathsWithPost> =
  JsonRequestBody<paths[P]['post']> extends never
    ? undefined
    : JsonRequestBody<paths[P]['post']>;

export async function apiPost<P extends PathsWithPost>(
  path: P,
  body: PostBody<P>,
  options: RequestOptions = {},
): Promise<OkJson<paths[P]['post']>> {
  return request(
    path as string,
    {
      method: 'POST',
      // `JSON.stringify(undefined)` is the JS value `undefined`, which
      // `fetch` already treats as "no body" — see `request`'s Content-Type
      // guard below — so a bodyless route sends no body rather than the
      // literal text "undefined".
      body: body === undefined ? undefined : JSON.stringify(body),
    },
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

// Every PUT route currently in the schema (`/expenses/{id}/like`) is
// bodyless — its only input is the `{id}` path param, same shape as the
// bodyless Friend Request accept POST above — so `apiPut` needs the same
// `undefined`-widening `PostBody` does, not `apiPatch`'s plain
// `JsonRequestBody` (every PATCH route has an actual body).
type PutBody<P extends PathsWithPut> =
  JsonRequestBody<paths[P]['put']> extends never
    ? undefined
    : JsonRequestBody<paths[P]['put']>;

export async function apiPut<P extends PathsWithPut>(
  path: P,
  body: PutBody<P>,
  options: RequestOptions = {},
): Promise<OkJson<paths[P]['put']>> {
  return request(
    path as string,
    {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    options,
  );
}

export async function apiDelete<P extends PathsWithDelete>(
  path: P,
  options: RequestOptions = {},
): Promise<void> {
  await request(path as string, { method: 'DELETE' }, options);
}

function buildQueryString(query: RequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, value);
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

async function request<T>(
  path: string,
  init: RequestInit,
  { token, params, query, signal }: RequestOptions,
): Promise<T> {
  const substituted = params
    ? Object.entries(params).reduce(
        (acc, [key, value]) =>
          acc.replace(`{${key}}`, encodeURIComponent(value)),
        path,
      )
    : path;
  const url = `${substituted}${buildQueryString(query)}`;

  const response = await fetch(`${API_BASE_URL}${url}`, {
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
    throw new ApiError(response.status, body, parseRetryAfterSeconds(response));
  }

  return body as T;
}

/** Only the whole-seconds form of `Retry-After` — this API never sends the HTTP-date form. */
function parseRetryAfterSeconds(response: Response): number | undefined {
  const header = response.headers.get('Retry-After');
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isInteger(seconds) && seconds > 0 ? seconds : undefined;
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
