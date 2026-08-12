import { Injectable } from '@nestjs/common';
import type { DailyRateProvider, DailyRateQuote } from './daily-rate-provider';

/**
 * The default `DailyRateProvider` binding until a real one lands (a later
 * ticket, along with the cron job that calls `DailyRateSnapshotService` on a
 * schedule). Deliberately returns no quotes rather than inventing rates: a
 * snapshot run against this provider writes nothing, so conversion reports
 * the honest "no Daily Rate available" failure (`ConversionService`) instead
 * of silently persisting a made-up Converted Amount.
 */
@Injectable()
export class StubDailyRateProvider implements DailyRateProvider {
  fetchRates(): Promise<DailyRateQuote[]> {
    return Promise.resolve([]);
  }
}
