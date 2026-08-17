import { Injectable, Logger } from '@nestjs/common';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../domain/currency';
import type { DailyRateProvider, DailyRateQuote } from './daily-rate-provider';

/** The primary (jsDelivr-mirrored) exchange-api host for one calendar date's base document. */
function primaryUrl(date: string, base: SupportedCurrency): string {
  return `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${base.toLowerCase()}.min.json`;
}

/** The fallback (Cloudflare Pages-mirrored) exchange-api host, tried when the primary fails. */
function fallbackUrl(date: string, base: SupportedCurrency): string {
  return `https://${date}.currency-api.pages.dev/v1/currencies/${base.toLowerCase()}.min.json`;
}

/**
 * One base currency's fetched document, keyed exactly as the exchange-api
 * dataset returns it: `{ date, [baseSlug]: { [quoteSlug]: number, ... } }`
 * with hundreds of currencies we don't care about mixed in. `unknown`
 * because it is untrusted network input — `extractRatesForBase` is the only
 * place that reads out of it.
 */
export type ExchangeApiDocumentsByBase = Partial<
  Record<SupportedCurrency, unknown>
>;

/**
 * Pulls this base's quote-per-base numbers for our Supported Currencies out
 * of one fetched document, silently ignoring both the hundreds of other
 * currencies the dataset carries and any non-numeric or non-positive entry
 * (the completeness pass in `assembleDailyRateQuotes` is what turns an
 * absence here into a hard failure, not this function).
 */
function extractRatesForBase(
  base: SupportedCurrency,
  document: unknown,
): Partial<Record<SupportedCurrency, number>> {
  const body = document as Record<string, unknown> | null | undefined;
  const ratesRaw = body?.[base.toLowerCase()];
  if (typeof ratesRaw !== 'object' || ratesRaw === null) {
    return {};
  }
  const rates = ratesRaw as Record<string, unknown>;

  const result: Partial<Record<SupportedCurrency, number>> = {};
  for (const quote of SUPPORTED_CURRENCIES) {
    if (quote === base) continue;
    const raw = rates[quote.toLowerCase()];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      result[quote] = raw;
    }
  }
  return result;
}

/**
 * Formats a rate as a fixed-notation decimal string matching
 * `DailyRate.rate`'s `Decimal(24, 10)` column: exactly ten fractional
 * digits, never exponential notation. `toFixed` alone is not safe for this
 * dataset — `String(4.4e-7)` would emit `"4.4e-7"` — so every rate must pass
 * through here rather than through template interpolation.
 */
export function decimalRateString(value: number): string {
  return value.toFixed(10);
}

/**
 * Assembles the 90 ordered-pair Daily Rate quotes (10 Supported Currencies,
 * each against the other 9) from the base-currency documents the provider
 * fetched. Pure and exported so specs can drive it without a network call —
 * `ExchangeApiDailyRateProvider.fetchRates` only fetches and delegates here.
 *
 * For a pair the dataset didn't publish directly, derives it from the
 * inverse pair when that one was fetched (the dataset frequently publishes
 * only one direction). A pair still missing after that — or one whose
 * formatted rate rounds to `0.0000000000` — fails the whole call: per
 * ADR-0001 a snapshot must never half-apply, so one bad pair must surface as
 * a thrown error, not a partial or zero rate silently written.
 */
export function assembleDailyRateQuotes(
  documentsByBase: ExchangeApiDocumentsByBase,
): DailyRateQuote[] {
  const ratesByBase: Partial<
    Record<SupportedCurrency, Partial<Record<SupportedCurrency, number>>>
  > = {};
  for (const base of SUPPORTED_CURRENCIES) {
    ratesByBase[base] = extractRatesForBase(base, documentsByBase[base]);
  }

  const quotes: DailyRateQuote[] = [];
  const missing: string[] = [];

  for (const base of SUPPORTED_CURRENCIES) {
    for (const quote of SUPPORTED_CURRENCIES) {
      if (quote === base) continue;

      const direct = ratesByBase[base]?.[quote];
      const value =
        direct ??
        (() => {
          const inverse = ratesByBase[quote]?.[base];
          return inverse === undefined ? undefined : 1 / inverse;
        })();

      if (value === undefined) {
        missing.push(`${base}->${quote}`);
        continue;
      }

      const rate = decimalRateString(value);
      if (Number.parseFloat(rate) === 0) {
        missing.push(`${base}->${quote}`);
        continue;
      }

      quotes.push({ baseCurrency: base, quoteCurrency: quote, rate });
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `ExchangeApiDailyRateProvider: missing Daily Rate pair(s): ${missing.join(', ')}`,
    );
  }

  return quotes;
}

/**
 * The production `DailyRateProvider`, backed by the fawazahmed0 exchange-api
 * open dataset (keyless, free, covers all our Supported Currencies including
 * VND) — see `DAILY_RATES_PROVIDER` in env.schema.ts for which environments
 * bind this vs. `StubDailyRateProvider`.
 *
 * Fetches one document per Supported Currency (the dataset is one-base-per-
 * file, fetched concurrently), each with a same-date mirror fallback, then
 * hands everything to `assembleDailyRateQuotes`. Any base whose document
 * can't be obtained from either host fails the entire call — per the
 * interface's contract, a partial result is worse than a clearly failed
 * one, since conversion's fall-back-to-an-earlier-date rule only stays
 * sound when a date holds either a full matrix or nothing.
 */
@Injectable()
export class ExchangeApiDailyRateProvider implements DailyRateProvider {
  private readonly logger = new Logger(ExchangeApiDailyRateProvider.name);

  async fetchRates(date: string): Promise<DailyRateQuote[]> {
    const documentsByBase: ExchangeApiDocumentsByBase = {};

    await Promise.all(
      SUPPORTED_CURRENCIES.map(async (base) => {
        documentsByBase[base] = await this.fetchDocument(date, base);
      }),
    );

    const quotes = assembleDailyRateQuotes(documentsByBase);
    this.logger.log(
      `Fetched ${quotes.length} Daily Rate quotes for ${date} from exchange-api`,
    );
    return quotes;
  }

  private async fetchDocument(
    date: string,
    base: SupportedCurrency,
  ): Promise<unknown> {
    try {
      return await this.fetchJson(primaryUrl(date, base));
    } catch (primaryError) {
      this.logger.warn(
        `Primary exchange-api host failed for ${base} on ${date} (${(primaryError as Error).message}); trying fallback host`,
      );
      try {
        return await this.fetchJson(fallbackUrl(date, base));
      } catch (fallbackError) {
        throw new Error(
          `ExchangeApiDailyRateProvider: both hosts failed fetching ${base} on ${date}`,
          { cause: fallbackError },
        );
      }
    }
  }

  private async fetchJson(url: string): Promise<unknown> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unexpected status ${response.status} from ${url}`);
    }
    return response.json();
  }
}
