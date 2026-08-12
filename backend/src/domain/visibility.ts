import type { Visibility as PersistedVisibility } from '../generated/prisma/enums';

/**
 * Who may see an Expense (see backend/CONTEXT.md — Visibility): **Private**
 * (owner only), **Friend-only** (owner and their Friends), or **Public**
 * (anyone).
 *
 * Tied to the Prisma enum `Visibility` the way SUPPORTED_CURRENCIES is tied
 * to its own (see domain/currency.ts): `satisfies` rejects a value the
 * column cannot store, and the exhaustiveness check below rejects the
 * omission of one it can.
 */
export const VISIBILITIES = [
  'private',
  'friend_only',
  'public',
] as const satisfies readonly PersistedVisibility[];

export type Visibility = (typeof VISIBILITIES)[number];

/** Compiles only while `T` is `never`, and names `T` in the error when it is not. */
type AssertNone<T extends never> = T;

export type EveryPersistedVisibilityIsListed = AssertNone<
  Exclude<PersistedVisibility, Visibility>
>;
