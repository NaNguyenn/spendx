import type { OneTimeCodePurpose as PersistedOneTimeCodePurpose } from '../generated/prisma/enums';

/**
 * What a One-Time Code proves (see backend/CONTEXT.md — One-Time Code):
 * Email Verification or Password Reset.
 *
 * Tied to the Prisma enum `OneTimeCodePurpose` the way SUPPORTED_CURRENCIES
 * is tied to its own: `satisfies` rejects a Purpose the column cannot store,
 * and the exhaustiveness check below rejects the omission of one it can.
 */
export const ONE_TIME_CODE_PURPOSES = [
  'email_verification',
  'password_reset',
] as const satisfies readonly PersistedOneTimeCodePurpose[];

export type OneTimeCodePurpose = (typeof ONE_TIME_CODE_PURPOSES)[number];

/** Compiles only while `T` is `never`, and names `T` in the error when it is not. */
type AssertNone<T extends never> = T;

export type EveryPersistedOneTimeCodePurposeIsListed = AssertNone<
  Exclude<PersistedOneTimeCodePurpose, OneTimeCodePurpose>
>;
