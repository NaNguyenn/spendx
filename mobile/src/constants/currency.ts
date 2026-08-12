import type { components } from '@/api/schema';

/**
 * The Supported Currency value set, taken from the generated contract rather
 * than restated here (ADR-0007) — the backend owns which currencies exist.
 */
export type SupportedCurrency = components['schemas']['SupportedCurrency'];

/**
 * The same value set as something that exists at runtime, because a picker
 * needs options and a TypeScript union does not survive compilation.
 *
 * The two annotations below are what stop this from becoming a second,
 * drifting copy of the contract: `satisfies` rejects a code the API does not
 * accept, and the exhaustiveness check underneath rejects the omission of one
 * the API does. Add a currency to the API, regenerate, and this file fails to
 * compile until it is listed here too.
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
] as const satisfies readonly SupportedCurrency[];

type MissingCurrency = Exclude<
  SupportedCurrency,
  (typeof SUPPORTED_CURRENCIES)[number]
>;

/** Compiles only while `T` is `never`, and names `T` in the error when it is not. */
type AssertNone<T extends never> = T;

export type EveryCurrencyIsListed = AssertNone<MissingCurrency>;
