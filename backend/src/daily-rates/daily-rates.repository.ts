import { Injectable } from '@nestjs/common';
import { calendarDateToDate } from '../domain/calendar-date';
import type { SupportedCurrency } from '../domain/currency';
import type { DailyRate } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { DailyRateQuote } from './daily-rate-provider';

/**
 * All persistence for the Daily Rate table. Nothing above this class knows
 * Prisma's query API — see rules/arch-use-repository-pattern.md.
 */
@Injectable()
export class DailyRatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The Daily Rate for `baseCurrency` -> `quoteCurrency` on `date`, falling
   * back to the most recent earlier one (backend/CONTEXT.md — Daily Rate).
   * `orderBy: rateDate desc` with `lte: date` is exactly the ordered scan the
   * unique index on (base, quote, date) exists to serve — see the doc
   * comment on `DailyRate` in schema.prisma.
   */
  findMostRecentAtOrBefore(
    baseCurrency: SupportedCurrency,
    quoteCurrency: SupportedCurrency,
    date: string,
  ): Promise<DailyRate | null> {
    return this.prisma.dailyRate.findFirst({
      where: {
        baseCurrency,
        quoteCurrency,
        rateDate: { lte: calendarDateToDate(date) },
      },
      orderBy: { rateDate: 'desc' },
    });
  }

  /**
   * How many rows the table holds on `date`. A count rather than an
   * existence check because a date can legitimately hold a *partial* matrix
   * — rows written by the dev seed, or by a run predating a currency's
   * addition — and `DailyRateSnapshotJob.catchUp` must treat such a date as
   * uncovered (one missing pair blocks all Expense logging with a 503,
   * ADR-0008) rather than skip it forever.
   */
  countRatesOn(date: string): Promise<number> {
    return this.prisma.dailyRate.count({
      where: { rateDate: calendarDateToDate(date) },
    });
  }

  /**
   * Writes one date's quotes into the table, upserting each pair so a
   * re-run (a retried snapshot job, or a test reseeding a date) overwrites
   * rather than duplicates. Runs as a single transaction — see
   * rules/db-use-transactions.md — so a snapshot can never half-apply and
   * leave some pairs on this date stale while others updated.
   */
  async upsertMany(date: string, quotes: DailyRateQuote[]): Promise<void> {
    if (quotes.length === 0) return;

    const rateDate = calendarDateToDate(date);
    await this.prisma.$transaction(
      quotes.map((quote) =>
        this.prisma.dailyRate.upsert({
          where: {
            baseCurrency_quoteCurrency_rateDate: {
              baseCurrency: quote.baseCurrency,
              quoteCurrency: quote.quoteCurrency,
              rateDate,
            },
          },
          create: {
            baseCurrency: quote.baseCurrency,
            quoteCurrency: quote.quoteCurrency,
            rateDate,
            rate: quote.rate,
          },
          update: { rate: quote.rate },
        }),
      ),
    );
  }
}
