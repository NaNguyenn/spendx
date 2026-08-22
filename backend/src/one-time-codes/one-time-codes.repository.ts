import { Injectable } from '@nestjs/common';
import type { OneTimeCodePurpose } from '../domain/one-time-code-purpose';
import type { OneTimeCode } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertOneTimeCodeData {
  userId: string;
  purpose: OneTimeCodePurpose;
  codeHash: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * All persistence for the One-Time Code machinery (backend/CONTEXT.md — One
 * -Time Code). Nothing above this class knows Prisma's query API.
 *
 * `@@unique([userId, purpose])` means "the live code for this User and
 * Purpose" is structurally at most one row — `upsert` is how a newly issued
 * code supersedes whatever was there, per the newest-wins invalidation
 * documented on the `OneTimeCode` model.
 */
@Injectable()
export class OneTimeCodesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLive(
    userId: string,
    purpose: OneTimeCodePurpose,
  ): Promise<OneTimeCode | null> {
    return this.prisma.oneTimeCode.findUnique({
      where: { userId_purpose: { userId, purpose } },
    });
  }

  upsert(data: UpsertOneTimeCodeData): Promise<OneTimeCode> {
    const { userId, purpose, codeHash, createdAt, expiresAt } = data;
    return this.prisma.oneTimeCode.upsert({
      where: { userId_purpose: { userId, purpose } },
      create: { userId, purpose, codeHash, createdAt, expiresAt },
      // failedAttempts resets implicitly: it is only ever set by `create`'s
      // column default, and superseding a code is exactly the case where a
      // stale attempt count must not carry over to the new one.
      update: { codeHash, createdAt, expiresAt, failedAttempts: 0 },
    });
  }

  incrementFailedAttempts(id: string): Promise<OneTimeCode> {
    return this.prisma.oneTimeCode.update({
      where: { id },
      data: { failedAttempts: { increment: 1 } },
    });
  }

  delete(id: string): Promise<OneTimeCode> {
    return this.prisma.oneTimeCode.delete({ where: { id } });
  }
}
