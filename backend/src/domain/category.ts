import type { Category as PersistedCategory } from '../generated/prisma/enums';

/**
 * The fixed, app-curated set of spending kinds a User may file an Expense
 * under (see backend/CONTEXT.md — Category). Language-neutral slugs; labels
 * are localized client-side, so the API never returns a human label.
 *
 * Tied to the Prisma enum `Category` the way SUPPORTED_CURRENCIES is tied to
 * its own (see domain/currency.ts): `satisfies` rejects a slug the column
 * cannot store, and the exhaustiveness check below rejects the omission of
 * one it can.
 */
export const CATEGORIES = [
  'housing',
  'food',
  'leisure',
  'investment',
  'other',
] as const satisfies readonly PersistedCategory[];

export type Category = (typeof CATEGORIES)[number];

/** Compiles only while `T` is `never`, and names `T` in the error when it is not. */
type AssertNone<T extends never> = T;

export type EveryPersistedCategoryIsListed = AssertNone<
  Exclude<PersistedCategory, Category>
>;
