import { Injectable } from '@nestjs/common';
import type { DailyRateProvider, DailyRateQuote } from './daily-rate-provider';

/**
 * The dev/test default `DailyRateProvider` binding, alongside the real
 * `ExchangeApiDailyRateProvider` (see `DAILY_RATES_PROVIDER` in
 * env.schema.ts for which environments get which). Deliberately returns no
 * quotes rather than inventing rates: a snapshot run against this provider
 * writes nothing, so conversion reports the honest "no Daily Rate available"
 * failure (`ConversionService`) instead of silently persisting a made-up
 * Converted Amount.
 */
@Injectable()
export class StubDailyRateProvider implements DailyRateProvider {
  fetchRates(): Promise<DailyRateQuote[]> {
    return Promise.resolve([]);
  }
}
