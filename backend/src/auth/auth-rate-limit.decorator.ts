import { type ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/** The name of the tighter throttler configured from AUTH_RATE_LIMIT_MAX. */
export const AUTH_THROTTLER = 'auth';

const AUTH_RATE_LIMITED = 'auth-rate-limited';

/**
 * Opts a route into the tighter AUTH_RATE_LIMIT_MAX allowance.
 *
 * Opt-in rather than opt-out on purpose. A throttler that applies everywhere
 * unless a controller remembers to exclude itself makes forgetting the
 * dangerous case: a new controller would silently inherit the credential
 * -guessing limit, which is far too tight for ordinary reads, and nothing
 * would say so until production traffic hit it.
 */
export const AuthRateLimited = () => SetMetadata(AUTH_RATE_LIMITED, true);

const reflector = new Reflector();

/**
 * The `skipIf` for the 'auth' throttler: it applies only where
 * `@AuthRateLimited()` says so.
 */
export function skipUnlessAuthRateLimited(context: ExecutionContext): boolean {
  return !reflector.getAllAndOverride<boolean>(AUTH_RATE_LIMITED, [
    context.getHandler(),
    context.getClass(),
  ]);
}
