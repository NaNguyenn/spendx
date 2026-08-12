import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { SupportedCurrency } from '../domain/currency';
import { Prisma } from '../generated/prisma/client';
import { DailyRatesRepository } from './daily-rates.repository';

export interface ConversionInput {
  /** The Original Amount, as a decimal string (see domain/money.ts). */
  amount: string;
  /** The Original Currency. */
  currency: SupportedCurrency;
  /** The owner's Preferred Currency — what the Converted Amount is in. */
  targetCurrency: SupportedCurrency;
  /**
   * The calendar date anchoring the Daily Rate — the *logging* date, never
   * the Expense Date (ADR-0002). Callers pass `calendarDateInAppTimezone`
   * of Logged At.
   */
  date: string;
}

export interface ConversionResult {
  amount: Prisma.Decimal;
  currency: SupportedCurrency;
}

/**
 * Computes an Expense's Converted Amount (backend/CONTEXT.md): the Original
 * Amount converted into the owner's Preferred Currency at the logging
 * date's Daily Rate, falling back to the most recent earlier rate. Reads
 * only the Daily Rate table — never the provider (ADR-0001).
 *
 * All arithmetic is `Prisma.Decimal` (decimal.js): `1.005 * 100` is
 * `100.49999999999999` as a JS float but exactly `100.5` here — the reason
 * this project's money columns and this service both refuse to touch a
 * `number`.
 */
@Injectable()
export class ConversionService {
  constructor(private readonly dailyRatesRepository: DailyRatesRepository) {}

  async convert(input: ConversionInput): Promise<ConversionResult> {
    if (input.currency === input.targetCurrency) {
      // Same-currency conversion is exact identity, not a rate lookup — an
      // Expense in the owner's own Preferred Currency must never be able to
      // fail because Daily Rate coverage happens to have a gap.
      return {
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
      };
    }

    const dailyRate = await this.dailyRatesRepository.findMostRecentAtOrBefore(
      input.currency,
      input.targetCurrency,
      input.date,
    );

    if (!dailyRate) {
      // Not a 4xx: the request is well-formed and nothing the caller did is
      // wrong. This is our Daily Rate table missing coverage for this pair
      // on or before the logging date — a gap in our own data pipeline (the
      // once-daily snapshot job, a later ticket) that resolves itself once
      // rates are backfilled. 503 says "retry later," which is true; a 4xx
      // would incorrectly blame the request.
      throw new ServiceUnavailableException(
        `No Daily Rate available for ${input.currency} -> ${input.targetCurrency} ` +
          `on or before ${input.date}`,
      );
    }

    // Quote-per-base (see schema.prisma's doc comment on DailyRate):
    // amount(base) * rate = amount(quote). Rounded to the money columns'
    // scale (4 decimal places) here so the value this method returns is
    // exactly the value that persists — never a display-time surprise.
    return {
      amount: dailyRate.rate.mul(input.amount).toDecimalPlaces(4),
      currency: input.targetCurrency,
    };
  }
}
