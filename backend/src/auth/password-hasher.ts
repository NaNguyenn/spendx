export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

/**
 * Hashes and verifies account passwords.
 *
 * A Symbol injection token because the interface is erased at compile time
 * (rules/di-use-interfaces-tokens.md) and because the hashing algorithm is
 * exactly the kind of boundary a test double should be able to replace.
 */
export interface PasswordHasher {
  /** Returns a self-describing string carrying its own parameters and salt. */
  hash(password: string): Promise<string>;
  verify(password: string, storedHash: string): Promise<boolean>;
}
