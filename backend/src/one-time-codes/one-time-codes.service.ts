import { Inject, Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { CLOCK, type Clock } from '../clock/clock';
import type { OneTimeCodePurpose } from '../domain/one-time-code-purpose';
import { OneTimeCodeCooldownException } from './one-time-code-cooldown.exception';
import {
  ONE_TIME_CODE_HASHER,
  type OneTimeCodeHasher,
} from './one-time-code-hasher';
import { OneTimeCodesRepository } from './one-time-codes.repository';

/**
 * The floor between two codes issued for the same (User, Purpose) —
 * machinery-level, shared by every Purpose (backend/CONTEXT.md — One-Time
 * Code) independent of each Purpose's own expiry (24 hours for Email
 * Verification, 15 minutes for Password Reset).
 */
export const ONE_TIME_CODE_COOLDOWN_MS = 60_000;

/** A code dies after this many wrong guesses, even to the correct value after. */
const MAX_FAILED_ATTEMPTS = 5;

/**
 * The one message every consumer of `confirm()` reports when it returns
 * false. Shared (Email Verification and Password Reset both use it) so the
 * two flows can never drift into distinguishable failure copy — the whole
 * point of `confirm()`'s uniform `false`.
 */
export const INVALID_OR_EXPIRED_CODE_MESSAGE = 'Invalid or expired code';

export interface IssueOneTimeCodeParams {
  userId: string;
  purpose: OneTimeCodePurpose;
  ttlMs: number;
}

export interface ConfirmOneTimeCodeParams {
  userId: string;
  purpose: OneTimeCodePurpose;
  code: string;
}

/**
 * Purpose-generic One-Time Code machinery (backend/CONTEXT.md — One-Time
 * Code): generation, hashing, cooldown, expiry, and the 5-failed-attempts
 * kill switch. Shared by Email Verification (this issue) and Password Reset
 * (issue #21) — neither flow's business rules (already-verified, session
 * revocation, ...) live here.
 */
@Injectable()
export class OneTimeCodesService {
  constructor(
    private readonly repository: OneTimeCodesRepository,
    @Inject(ONE_TIME_CODE_HASHER) private readonly hasher: OneTimeCodeHasher,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Generates a fresh 6-digit code, hashes it, and stores it as the (only)
   * live code for (userId, purpose) — superseding whatever was there
   * (newest-wins, see `OneTimeCodesRepository.upsert`). Returns the plain
   * code; it is never persisted anywhere.
   *
   * @throws OneTimeCodeCooldownException if a code for this (userId, purpose)
   * was issued less than `ONE_TIME_CODE_COOLDOWN_MS` ago.
   */
  async issue(params: IssueOneTimeCodeParams): Promise<string> {
    const { userId, purpose, ttlMs } = params;
    const now = this.clock.now();

    const existing = await this.repository.findLive(userId, purpose);
    if (existing) {
      const cooldownEndsAt = new Date(
        existing.createdAt.getTime() + ONE_TIME_CODE_COOLDOWN_MS,
      );
      if (now < cooldownEndsAt) {
        const retryAfterSeconds = Math.ceil(
          (cooldownEndsAt.getTime() - now.getTime()) / 1000,
        );
        throw new OneTimeCodeCooldownException(retryAfterSeconds);
      }
    }

    const code = generateCode();
    const codeHash = await this.hasher.hash(code);
    await this.repository.upsert({
      userId,
      purpose,
      codeHash,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
    });

    return code;
  }

  /**
   * Confirms `code` against the live code for (userId, purpose). Every
   * failure mode — no live code, expired, dead (5 failed attempts), or a
   * plain mismatch — reports the same `false`, so a caller can 400
   * uniformly with no oracle for which one happened (backend/CONTEXT.md —
   * One-Time Code). A successful confirmation deletes the row: One-Time
   * Codes are single-use.
   */
  async confirm(params: ConfirmOneTimeCodeParams): Promise<boolean> {
    const { userId, purpose, code } = params;
    const row = await this.repository.findLive(userId, purpose);
    if (!row) return false;

    const now = this.clock.now();
    if (now > row.expiresAt) return false;
    if (row.failedAttempts >= MAX_FAILED_ATTEMPTS) return false;

    const matches = await this.hasher.verify(code, row.codeHash);
    if (!matches) {
      await this.repository.incrementFailedAttempts(row.id);
      return false;
    }

    await this.repository.delete(row.id);
    return true;
  }
}

/** A crypto-random 6-digit code, zero-padded ("000000"–"999999"). */
function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}
