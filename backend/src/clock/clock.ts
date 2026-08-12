export const CLOCK = Symbol('CLOCK');

/**
 * The application's sole source of "now" — one of the project's two
 * internal seams (issue #1, "Testing Decisions"; docs/adr/0002, 0004).
 * Everything that needs the current instant takes it
 * from here rather than calling `new Date()` directly, so tests can pin
 * Logged At, Expense Date defaulting, and Daily Rate anchoring to an exact
 * moment — including Asia/Ho_Chi_Minh timezone edges — without flakiness.
 *
 * A Symbol injection token because the interface is erased at compile time
 * (rules/di-use-interfaces-tokens.md).
 */
export interface Clock {
  now(): Date;
}
