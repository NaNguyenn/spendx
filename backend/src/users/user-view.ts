import type { User } from '../generated/prisma/client';
import { PrivateUserDto } from './dto/private-user.dto';
import { PublicUserDto } from './dto/public-user.dto';

/**
 * The single place a User row becomes a response body.
 *
 * `passwordHash` and `email` are read off the Prisma row here and nowhere
 * else outside this module — `toPublicUser` never touches either, so a
 * response describing somebody else structurally cannot leak them.
 */
export function toPublicUser(user: User): PublicUserDto {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
  };
}

/** Only for the authenticated caller's own account. */
export function toPrivateUser(user: User): PrivateUserDto {
  return {
    ...toPublicUser(user),
    email: user.email,
    preferredCurrency: user.preferredCurrency,
    locale: user.locale,
    createdAt: user.createdAt.toISOString(),
  };
}
