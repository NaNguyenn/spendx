import { Inject, Injectable } from '@nestjs/common';
import {
  DAILY_RATE_PROVIDER,
  type DailyRateProvider,
} from './daily-rate-provider';
import { DailyRatesRepository } from './daily-rates.repository';

/**
 * The only place `DailyRateProvider` is called (per ADR-0001 — see the
 * interface's own doc comment). Pulls one calendar date's rates from the
 * provider and writes them into the Daily Rate table; `ConversionService`
 * reads that table and never touches the provider.
 *
 * Nothing in this ticket schedules this — the once-daily cron job that
 * would call it (against the real provider, once one exists) is a later
 * ticket. Tests call it directly after configuring a fake provider, which is
 * how they "inject fixed rates" through this seam rather than writing rows
 * into the table by hand.
 */
@Injectable()
export class DailyRateSnapshotService {
  constructor(
    @Inject(DAILY_RATE_PROVIDER)
    private readonly provider: DailyRateProvider,
    private readonly dailyRatesRepository: DailyRatesRepository,
  ) {}

  async snapshotFor(date: string): Promise<void> {
    const quotes = await this.provider.fetchRates(date);
    await this.dailyRatesRepository.upsertMany(date, quotes);
  }
}
