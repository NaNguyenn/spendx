import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { CLOCK, type Clock } from '../clock/clock';
import type { Env } from '../config/env.schema';
import { SUPPORTED_CURRENCIES } from '../domain/currency';
import {
  APP_TIMEZONE,
  calendarDateFromDate,
  calendarDateInAppTimezone,
  calendarDateToDate,
} from '../domain/calendar-date';
import { DailyRateSnapshotService } from './daily-rate-snapshot.service';
import { DailyRatesRepository } from './daily-rates.repository';

/**
 * Every ordered Supported Currency pair — the row count a fully-snapshotted
 * date carries (ADR-0008; ~90 for 10 currencies). Fewer rows on a date means
 * a partial matrix (a dev seed, or rows predating a currency's addition),
 * which blocks all Expense logging with a 503 — exactly what the catch-up
 * must heal, so coverage is judged against this, not against "any row".
 */
const FULL_MATRIX_SIZE =
  SUPPORTED_CURRENCIES.length * (SUPPORTED_CURRENCIES.length - 1);

/**
 * Keeps the Daily Rate table populated without a person ever running the
 * snapshot by hand: a once-daily cron plus a boot-time catch-up, both
 * driving the same idempotent `catchUp()` (see `DailyRateSnapshotService`
 * for the actual provider -> table write).
 */
@Injectable()
export class DailyRateSnapshotJob implements OnApplicationBootstrap {
  private readonly logger = new Logger(DailyRateSnapshotJob.name);

  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly snapshotService: DailyRateSnapshotService,
    private readonly dailyRatesRepository: DailyRatesRepository,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  /**
   * Snapshots every date in the backfill window that doesn't already hold a
   * full ordered-pair matrix, one date at a time, and never lets one date's
   * failure stop the rest — a missing or provider-failed date simply stays
   * missing (conversion's most-recent-earlier fallback covers it) rather
   * than blocking every other date in the window.
   */
  async catchUp(): Promise<void> {
    const today = calendarDateInAppTimezone(this.clock.now());
    const backfillDays = this.configService.get('DAILY_RATES_BACKFILL_DAYS', {
      infer: true,
    });

    for (const date of this.windowEndingAt(today, backfillDays)) {
      try {
        const existing = await this.dailyRatesRepository.countRatesOn(date);
        if (existing >= FULL_MATRIX_SIZE) continue;

        await this.snapshotService.snapshotFor(date);
      } catch (error) {
        this.logger.warn(
          `Daily Rate snapshot failed for ${date}: ${(error as Error).message}`,
        );
      }
    }
  }

  /** `backfillDays + 1` calendar dates, oldest first, ending at (and including) `today`. */
  private windowEndingAt(today: string, backfillDays: number): string[] {
    const todayAsDate = calendarDateToDate(today);
    const dates: string[] = [];
    for (let offset = backfillDays; offset >= 0; offset--) {
      const date = new Date(todayAsDate);
      date.setUTCDate(date.getUTCDate() - offset);
      dates.push(calendarDateFromDate(date));
    }
    return dates;
  }

  /**
   * Once daily at 15:00 ICT (08:00 UTC). The exchange-api dataset's file for
   * calendar date D is published during D's UTC morning, so 08:00 UTC gives
   * it margin to land; until it does, conversion falls back to the previous
   * day's rate (`DailyRatesRepository.findMostRecentAtOrBefore`), and if
   * *that* day's snapshot was itself missed, this same catch-up window heals
   * it on the next run.
   */
  @Cron('0 15 * * *', { timeZone: APP_TIMEZONE })
  async handleCron(): Promise<void> {
    // rules/error-handle-async-errors.md: a scheduled task is its own top of
    // stack — anything escaping it (say, the database down at 15:00, failing
    // the coverage count before catchUp's per-date guard) would be an
    // unhandled rejection, not a request error someone sees.
    try {
      await this.catchUp();
    } catch (error) {
      this.logger.error(
        `Daily Rate cron catch-up failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Fires `catchUp()` on boot, without blocking startup on it, so a fresh
   * deployment has rates immediately (rather than waiting for the first
   * cron tick) and backdated Expenses have history to convert against. The
   * internal catch keeps this from ever becoming an unhandled rejection —
   * `catchUp()` already swallows per-date failures, so this only guards
   * against catastrophic, whole-run failures (e.g. the database being
   * unreachable at boot).
   */
  onApplicationBootstrap(): void {
    void this.catchUp().catch((error: unknown) => {
      this.logger.error(
        `Daily Rate boot catch-up failed: ${(error as Error).message}`,
      );
    });
  }
}
