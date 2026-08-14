import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../domain/currency';
import { Prisma } from '../generated/prisma/client';
import { DailyRatesRepository } from './daily-rates.repository';

export interface ConversionSnapshotInput {
  /** The Original Amount, as a decimal string (see domain/money.ts). */
  amount: string;
  /** The Original Currency. */
  currency: SupportedCurrency;
  /**
   * The calendar date anchoring the Daily Rates — the *logging* date, never
   * the Expense Date (ADR-0002). Callers pass `calendarDateInAppTimezone`
   * of Logged At.
   */
  date: string;
}

/** One entry of a Conversion Snapshot, ready to persist. */
export interface ConversionSnapshotEntry {
  currency: SupportedCurrency;
  amount: Prisma.Decimal;
}

/**
 * Computes an Expense's Conversion Snapshot (backend/CONTEXT.md, ADR-0008):
 * the Original Amount in every Supported Currency at the logging date's
 * Daily Rate, falling back per pair to the most recent earlier rate. Reads
 * only the Daily Rate table — never the provider (ADR-0001).
 *
 * All-or-nothing: one uncovered pair fails the whole snapshot, so an
 * Expense either persists with every entry or not at all.
 *
 * All arithmetic is `Prisma.Decimal` (decimal.js): `1.005 * 100` is
 * `100.49999999999999` as a JS float but exactly `100.5` here — the reason
 * this project's money columns and this service both refuse to touch a
 * `number`.
 */
@Injectable()
export class ConversionService {
  constructor(private readonly dailyRatesRepository: DailyRatesRepository) {}

  async snapshot(
    input: ConversionSnapshotInput,
  ): Promise<ConversionSnapshotEntry[]> {
    const entries = await Promise.all(
      SUPPORTED_CURRENCIES.map(async (currency) => {
        if (currency === input.currency) {
          // The same-currency entry is exact identity, not a rate lookup —
          // "exactly as entered" must never pass through arithmetic.
          return { currency, amount: new Prisma.Decimal(input.amount) };
        }

        const dailyRate =
          await this.dailyRatesRepository.findMostRecentAtOrBefore(
            input.currency,
            currency,
            input.date,
          );
        if (!dailyRate) {
          return { currency, amount: null };
        }

        // Quote-per-base (see schema.prisma's doc comment on DailyRate):
        // amount(base) * rate = amount(quote). Rounded to the money columns'
        // scale (4 decimal places) here so the value this method returns is
        // exactly the value that persists — never a display-time surprise.
        return {
          currency,
          amount: dailyRate.rate.mul(input.amount).toDecimalPlaces(4),
        };
      }),
    );

    const uncovered = entries
      .filter((entry) => entry.amount === null)
      .map((entry) => entry.currency);
    if (uncovered.length > 0) {
      // Not a 4xx: the request is well-formed and nothing the caller did is
      // wrong. This is our Daily Rate table missing coverage for these pairs
      // on or before the logging date — a gap in our own data pipeline (the
      // once-daily snapshot job, a later ticket) that resolves itself once
      // rates are backfilled. 503 says "retry later," which is true; a 4xx
      // would incorrectly blame the request.
      throw new ServiceUnavailableException(
        `No Daily Rate available for ${input.currency} -> ` +
          `${uncovered.join(', ')} on or before ${input.date}`,
      );
    }

    return entries.filter(
      (entry): entry is ConversionSnapshotEntry => entry.amount !== null,
    );
  }
}
