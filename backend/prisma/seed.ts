import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';
import { ScryptPasswordHasher } from '../src/auth/scrypt-password-hasher';
import { calendarDateToDate } from '../src/domain/calendar-date';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../src/domain/currency';

/**
 * The development dataset. Deterministic on purpose: the same rows every run,
 * so a screenshot or a manual click-through means something and two runs can be
 * compared.
 *
 * The integration suite deliberately does NOT use this — tests arrange through
 * the public API so a viewer's expected view is visible in the test itself.
 *
 * The cast grows with the feature tickets: Users, Expenses and Daily Rates
 * with #4/#5, Friendships and Friend Requests with #11, Blocks with #15. Add
 * them here as those models land, keeping every value fixed.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set — see backend/.env.example.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// Every seeded account signs in with this password. Never used outside a
// local development database.
const DEV_PASSWORD = 'spendx-dev-password';

/** The people. Fixed ids so seeded data is stable across runs. */
const users = [
  {
    id: '01920000-0000-7000-8000-000000000001',
    email: 'you@example.com',
    username: 'you',
    displayName: 'You',
    preferredCurrency: 'VND' as const,
    locale: 'en' as const,
  },
  {
    id: '01920000-0000-7000-8000-000000000002',
    email: 'mai@example.com',
    username: 'mai',
    displayName: 'Mai',
    preferredCurrency: 'VND' as const,
    locale: 'vi' as const,
  },
  {
    id: '01920000-0000-7000-8000-000000000003',
    email: 'tuan@example.com',
    username: 'tuan',
    displayName: 'Tuấn',
    preferredCurrency: 'VND' as const,
    locale: 'vi' as const,
  },
  {
    id: '01920000-0000-7000-8000-000000000004',
    email: 'linh@example.com',
    username: 'linh',
    displayName: 'Linh',
    preferredCurrency: 'VND' as const,
    locale: 'vi' as const,
  },
  {
    // Blocks you once #15 lands; here so the blocked-viewer cases have a body.
    id: '01920000-0000-7000-8000-000000000005',
    email: 'blocked@example.com',
    username: 'blocked',
    displayName: 'Blocked Stranger',
    preferredCurrency: 'USD' as const,
    locale: 'en' as const,
  },
  {
    id: '01920000-0000-7000-8000-000000000006',
    email: 'stranger@example.com',
    username: 'stranger',
    displayName: 'Stranger',
    preferredCurrency: 'USD' as const,
    locale: 'en' as const,
  },
];

const YOU_ID = users[0].id;

/**
 * One fixed calendar date in the past, deliberately not `new Date()` — see
 * this file's own doc comment on determinism. `ConversionService` /
 * `DailyRatesRepository.findMostRecentAtOrBefore` falls back to the most
 * recent Daily Rate *at or before* the logging date, so a single date safely
 * in the past covers conversion for every Expense logged from now on;
 * "fixing" this to today's date would silently stop covering yesterday's
 * screenshot.
 */
const RATE_DATE = '2026-01-01';

/**
 * Development fixture anchors — plausible mid-2026 magnitudes (1 USD =
 * 25,000 VND), hand-picked, NOT real market data. Never point anything that
 * cares about accuracy at this table.
 *
 * Since ADR-0008 every logged Expense derives a Conversion Snapshot across
 * ALL Supported Currencies, so the Daily Rate table needs every ordered
 * pair, not just ->USD/->VND. Rather than hand-writing 90 rows, each
 * currency gets one USD anchor and `buildDailyRates` derives
 * rate(A->B) = usd(A) / usd(B) with decimal.js (never a JS float), rounded
 * to the column's 10 decimal places. Cross-rates are therefore mutually
 * consistent up to that rounding — e.g. GBP->VND is exactly the old
 * hand-computed 31,250.
 */
const USD_PER_UNIT: Record<SupportedCurrency, string> = {
  USD: '1',
  VND: '0.00004',
  EUR: '1.08',
  GBP: '1.25',
  JPY: '0.0065',
  SGD: '0.75',
  AUD: '0.65',
  CAD: '0.72',
  KRW: '0.00072',
  THB: '0.0275',
};

/**
 * The stored rate for one ordered pair, exactly as `buildDailyRates` writes
 * it — conversions below must read this (the table's rounded value), not the
 * raw anchors, to land on the same digits `ConversionService` would.
 */
function fixtureRate(
  base: SupportedCurrency,
  quote: SupportedCurrency,
): Prisma.Decimal {
  return new Prisma.Decimal(USD_PER_UNIT[base])
    .div(USD_PER_UNIT[quote])
    .toDecimalPlaces(10);
}

/**
 * Every ordered pair of distinct Supported Currencies (90 rows for 10
 * currencies), quote-per-base (see the doc comment on `DailyRate` in
 * schema.prisma): `amount(base) * rate = amount(quote)`. Same-currency
 * pairs are skipped: the Conversion Snapshot's identity entry never does a
 * lookup (`ConversionService.snapshot()`), so those rows would be dead
 * weight.
 */
function buildDailyRates(): Array<{
  id: string;
  baseCurrency: SupportedCurrency;
  quoteCurrency: SupportedCurrency;
  rateDate: Date;
  rate: string;
}> {
  const rateDate = calendarDateToDate(RATE_DATE);
  const rows: Array<{
    id: string;
    baseCurrency: SupportedCurrency;
    quoteCurrency: SupportedCurrency;
    rateDate: Date;
    rate: string;
  }> = [];
  for (const baseCurrency of SUPPORTED_CURRENCIES) {
    for (const quoteCurrency of SUPPORTED_CURRENCIES) {
      if (baseCurrency === quoteCurrency) continue;
      rows.push({
        id: `01920000-0000-7000-8100-${String(rows.length + 1).padStart(12, '0')}`,
        baseCurrency,
        quoteCurrency,
        rateDate,
        rate: fixtureRate(baseCurrency, quoteCurrency).toString(),
      });
    }
  }
  return rows;
}

/**
 * A handful of `you`'s Expenses so the Expenses tab has content before the
 * demo path logs anything new. Spans all five Category values and all three
 * Visibility values; the concert ticket is in USD so the list shows a
 * Converted Amount that differs from the Original Amount.
 *
 * `expenseDate` and `loggedAt` are picked so the app-timezone (ICT, UTC+7)
 * calendar date matches on both — every `loggedAt` below is a UTC morning or
 * early afternoon, which is still the same calendar day once shifted +7h —
 * exactly what `ExpensesService.create` would have derived, had these gone
 * through the API instead of being seeded directly.
 *
 * Each Expense's Conversion Snapshot is derived by `buildConversions` below
 * from the same stored fixture rates, with the same arithmetic
 * `ConversionService.snapshot()` uses — identity for the Original Currency,
 * `originalAmount * rate` rounded to 4 decimal places for the rest — so the
 * seeded rows are exactly what logging these through the API at RATE_DATE
 * would have produced (e.g. the USD concert ticket's VND entry: 50.00 *
 * 25,000 = 1,250,000.0000).
 */
const expenses = [
  {
    id: '01920000-0000-7000-8200-000000000001',
    ownerId: YOU_ID,
    description: 'Cà phê với Minh',
    originalAmount: '45000',
    originalCurrency: 'VND' as const,
    category: 'food' as const,
    visibility: 'friend_only' as const,
    expenseDate: calendarDateToDate('2026-01-05'),
    loggedAt: new Date('2026-01-05T01:15:00.000Z'), // 08:15 ICT
  },
  {
    id: '01920000-0000-7000-8200-000000000002',
    ownerId: YOU_ID,
    description: 'Grab về nhà',
    originalAmount: '65000',
    originalCurrency: 'VND' as const,
    category: 'other' as const,
    visibility: 'private' as const,
    expenseDate: calendarDateToDate('2026-01-05'),
    loggedAt: new Date('2026-01-05T11:40:00.000Z'), // 18:40 ICT
  },
  {
    id: '01920000-0000-7000-8200-000000000003',
    ownerId: YOU_ID,
    description: 'Concert Hà Anh Tuấn',
    originalAmount: '50.00',
    originalCurrency: 'USD' as const,
    // 50.00 * 25000 (USD->VND @ RATE_DATE) = 1,250,000.0000
    category: 'leisure' as const,
    visibility: 'public' as const,
    expenseDate: calendarDateToDate('2026-01-06'),
    loggedAt: new Date('2026-01-06T13:00:00.000Z'), // 20:00 ICT
  },
  {
    id: '01920000-0000-7000-8200-000000000004',
    ownerId: YOU_ID,
    description: 'Cổ phiếu VNM',
    originalAmount: '5000000',
    originalCurrency: 'VND' as const,
    category: 'investment' as const,
    visibility: 'private' as const,
    expenseDate: calendarDateToDate('2026-01-07'),
    loggedAt: new Date('2026-01-07T03:00:00.000Z'), // 10:00 ICT
  },
  {
    id: '01920000-0000-7000-8200-000000000005',
    ownerId: YOU_ID,
    description: 'Chợ Bến Thành',
    originalAmount: '220000',
    originalCurrency: 'VND' as const,
    category: 'food' as const,
    visibility: 'public' as const,
    expenseDate: calendarDateToDate('2026-01-08'),
    loggedAt: new Date('2026-01-08T02:30:00.000Z'), // 09:30 ICT
  },
  {
    id: '01920000-0000-7000-8200-000000000006',
    ownerId: YOU_ID,
    description: 'Tiền nhà tháng 1',
    originalAmount: '8500000',
    originalCurrency: 'VND' as const,
    category: 'housing' as const,
    visibility: 'friend_only' as const,
    expenseDate: calendarDateToDate('2026-01-09'),
    loggedAt: new Date('2026-01-09T00:00:00.000Z'), // 07:00 ICT
  },
];

/**
 * The Conversion Snapshot rows for every seeded Expense (ADR-0008): one row
 * per Supported Currency — identity for the Original Currency, otherwise
 * `originalAmount * fixtureRate` rounded to the money columns' 4 decimal
 * places, mirroring `ConversionService.snapshot()` digit for digit.
 */
function buildConversions(): Array<{
  expenseId: string;
  currency: SupportedCurrency;
  amount: string;
}> {
  return expenses.flatMap((expense) =>
    SUPPORTED_CURRENCIES.map((currency) => ({
      expenseId: expense.id,
      currency,
      amount:
        currency === expense.originalCurrency
          ? new Prisma.Decimal(expense.originalAmount).toFixed(4)
          : fixtureRate(expense.originalCurrency, currency)
              .mul(expense.originalAmount)
              .toDecimalPlaces(4)
              .toFixed(4),
    })),
  );
}

async function main(): Promise<void> {
  const passwordHasher = new ScryptPasswordHasher();
  const passwordHash = await passwordHasher.hash(DEV_PASSWORD);

  // skipDuplicates rather than upsert: re-seeding leaves existing rows exactly
  // as they are, instead of bumping every updatedAt on every run. Use
  // `make db-reset` when you want the dataset rebuilt from scratch.
  const { count: userCount } = await prisma.user.createMany({
    data: users.map((user) => ({ ...user, passwordHash })),
    skipDuplicates: true,
  });

  const dailyRates = buildDailyRates();
  const { count: dailyRateCount } = await prisma.dailyRate.createMany({
    data: dailyRates,
    skipDuplicates: true,
  });

  const { count: expenseCount } = await prisma.expense.createMany({
    data: expenses,
    skipDuplicates: true,
  });

  // Separate createMany rather than nested create: expenses above use
  // skipDuplicates on fixed ids, and the (expenseId, currency) PK gives
  // these the same idempotency. Seeded after their Expenses so the FK holds.
  const conversions = buildConversions();
  const { count: conversionCount } = await prisma.expenseConversion.createMany({
    data: conversions,
    skipDuplicates: true,
  });

  console.log(
    `Seeded ${userCount} of ${users.length} users (the rest existed).`,
  );
  console.log(
    `Seeded ${dailyRateCount} of ${dailyRates.length} daily rates (the rest existed).`,
  );
  console.log(
    `Seeded ${expenseCount} of ${expenses.length} expenses (the rest existed).`,
  );
  console.log(
    `Seeded ${conversionCount} of ${conversions.length} conversion snapshot ` +
      `rows (the rest existed).`,
  );
  console.log(`Every seeded account's password is "${DEV_PASSWORD}".`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
