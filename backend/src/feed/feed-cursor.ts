import { BadRequestException } from '@nestjs/common';
import {
  registerDecorator,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

/**
 * The keyset position of one Feed item: `(loggedAt DESC, id DESC)`.
 *
 * `loggedAt` round-trips through millisecond-precision ISO, which is exact
 * only while the column stays Prisma's default `timestamp(3)`. Raising the
 * column's precision would make the predicate's equality arm miss rows at
 * page boundaries — this encoding must gain matching precision in step.
 */
export interface FeedCursor {
  loggedAt: Date;
  id: string;
}

const CURSOR_SEPARATOR = '|';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Encodes a page's last item into the opaque `?cursor=` token the next page
 * is requested with — base64url of `<Logged At ISO>|<id>`, produced and
 * parsed only here so its shape can change without any caller noticing.
 */
export function encodeFeedCursor(cursor: FeedCursor): string {
  const raw = `${cursor.loggedAt.toISOString()}${CURSOR_SEPARATOR}${cursor.id}`;
  return Buffer.from(raw, 'utf8').toString('base64url');
}

/**
 * Decodes a `?cursor=` token produced by {@link encodeFeedCursor}. Throws
 * `BadRequestException` for anything that isn't exactly what this module
 * produced — a malformed cursor is a 400, never a 500 (issue #13) — so a
 * client's stale or hand-crafted token fails loudly and early rather than
 * corrupting the keyset predicate.
 */
export function decodeFeedCursor(token: string): FeedCursor {
  const raw = Buffer.from(token, 'base64url').toString('utf8');
  const separatorIndex = raw.indexOf(CURSOR_SEPARATOR);
  if (separatorIndex === -1) {
    throw new BadRequestException('cursor is malformed');
  }

  const loggedAtRaw = raw.slice(0, separatorIndex);
  const id = raw.slice(separatorIndex + 1);
  const loggedAt = new Date(loggedAtRaw);

  const isValidLoggedAt =
    !Number.isNaN(loggedAt.getTime()) && loggedAt.toISOString() === loggedAtRaw;
  if (!isValidLoggedAt || !UUID_PATTERN.test(id)) {
    throw new BadRequestException('cursor is malformed');
  }

  return { loggedAt, id };
}

/** True for a token {@link decodeFeedCursor} can parse without throwing. */
export function isValidFeedCursorToken(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  try {
    decodeFeedCursor(value);
    return true;
  } catch {
    return false;
  }
}

@ValidatorConstraint({ name: 'isFeedCursor', async: false })
class IsFeedCursorConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isValidFeedCursorToken(value);
  }

  defaultMessage(): string {
    return '$property is malformed';
  }
}

/** class-validator decorator wrapping `isValidFeedCursorToken`. */
export function IsFeedCursor(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsFeedCursorConstraint,
    });
  };
}
