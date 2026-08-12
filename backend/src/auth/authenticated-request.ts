import type { Request } from 'express';

/** The identity `JwtAuthGuard` attaches to a request once a token verifies. */
export interface AuthenticatedUser {
  id: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
