export const ONE_TIME_CODE_HASHER = Symbol('ONE_TIME_CODE_HASHER');

/**
 * Hashes and verifies a One-Time Code at rest (backend/CONTEXT.md — the
 * plain code is only ever handed back once, to the caller that issued it).
 *
 * A Symbol injection token because the interface is erased at compile time
 * (rules/di-use-interfaces-tokens.md). Deliberately its own interface rather
 * than importing `PasswordHasher` from `src/auth`: this module is wired
 * with `ScryptPasswordHasher` structurally (`one-time-codes.module.ts`
 * imports the class file directly, not `AuthModule`), so nothing here
 * depends on the auth module's own contract (Interface Segregation —
 * rules/di-interface-segregation.md) — the two interfaces just happen to
 * have the same shape today.
 */
export interface OneTimeCodeHasher {
  hash(value: string): Promise<string>;
  verify(value: string, storedHash: string): Promise<boolean>;
}
