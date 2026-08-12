import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route (or an entire controller) out of the global auth guard.
 * Authentication is the default — see `JwtAuthGuard` — so a new endpoint is
 * protected unless it deliberately says otherwise here.
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
