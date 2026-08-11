import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { HealthResponseDto } from './health.dto';

/**
 * How long the database has to answer before it counts as down.
 *
 * A probe that waits indefinitely reports "healthy" for as long as the
 * connection hangs, which is precisely when it should not.
 */
const DATABASE_PROBE_TIMEOUT_MS = 2_000;

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponseDto> {
    try {
      await withTimeout(
        this.prisma.$queryRaw`SELECT 1`,
        DATABASE_PROBE_TIMEOUT_MS,
      );
    } catch (error: unknown) {
      // The cause is attached for the logs, not serialised into the response —
      // a health endpoint is public and database errors are not.
      throw new ServiceUnavailableException(
        { status: 'error', database: 'down' },
        { cause: error },
      );
    }

    return { status: 'ok', database: 'up' };
  }
}

async function withTimeout<T>(work: PromiseLike<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Database did not respond within ${ms}ms`)),
      ms,
    );
  });

  try {
    return await Promise.race([work, expiry]);
  } finally {
    clearTimeout(timer);
  }
}
