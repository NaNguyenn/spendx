import type { SupportedCurrency as PersistedCurrency } from '../generated/prisma/enums';

/**
 * The curated list of currencies a User may pick for an Original Amount or as
 * Preferred Currency (see backend/CONTEXT.md — Supported Currency).
 *
 * The database holds the same set, as the Prisma enum `SupportedCurrency`, and
 * the annotations below tie this list to it rather than trusting a comment:
 * `satisfies` rejects a currency the column cannot store, and the exhaustiveness
 * check rejects the omission of one it can. Adding a currency therefore means
 * editing the schema, migrating, and extending this list — and nothing compiles
 * until all three agree.
 */
export const SUPPORTED_CURRENCIES = [
  'VND',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'SGD',
  'AUD',
  'CAD',
  'KRW',
  'THB',
] as const satisfies readonly PersistedCurrency[];

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Compiles only while `T` is `never`, and names `T` in the error when it is not. */
type AssertNone<T extends never> = T;

export type EveryPersistedCurrencyIsListed = AssertNone<
  Exclude<PersistedCurrency, SupportedCurrency>
>;
