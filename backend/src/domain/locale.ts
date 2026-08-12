import type { Locale as PersistedLocale } from '../generated/prisma/enums';

/**
 * A User's account-level language (see backend/CONTEXT.md — Locale).
 *
 * Tied to the Prisma enum `Locale` the way SUPPORTED_CURRENCIES is tied to its
 * own: `satisfies` rejects a Locale the column cannot store, and the
 * exhaustiveness check below rejects the omission of one it can.
 */
export const LOCALES = [
  'en',
  'vi',
] as const satisfies readonly PersistedLocale[];

export type Locale = (typeof LOCALES)[number];

/** Compiles only while `T` is `never`, and names `T` in the error when it is not. */
type AssertNone<T extends never> = T;

export type EveryPersistedLocaleIsListed = AssertNone<
  Exclude<PersistedLocale, Locale>
>;
