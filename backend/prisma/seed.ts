import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
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
 * Development fixture rates — plausible mid-2026 magnitudes, hand-picked and
 * self-consistent (each currency's ->VND rate is its ->USD rate times the
 * USD->VND rate, computed by hand below, never through a JS float), but NOT
 * real market data. Never point anything that cares about accuracy at this
 * table.
 *
 * `rate` is quote-per-base (see the doc comment on `DailyRate` in
 * schema.prisma): `amount(base) * rate = amount(quote)`. The two Preferred
 * Currencies present in the seeded User set are VND and USD (see `users`
 * above), so `ConversionService` only ever needs a rate quoted in one of
 * those two — every other Supported Currency appears here once as a base
 * against each, for 9 non-identity bases * 2 quote currencies = 18 rows.
 * VND->VND and USD->USD are skipped: `ConversionService.convert()`
 * short-circuits same-currency conversion without a lookup, so those rows
 * would be dead weight.
 *
 * Anchor: 1 USD = 25,000 VND. Every ->VND rate below is that currency's
 * ->USD rate * 25,000, worked out by hand (e.g. EUR: 1.08 * 25,000 =
 * 27,000).
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
    baseCurrency: SupportedCurrency;
    quoteCurrency: SupportedCurrency;
    rate: string;
  }> = [
    // VND <-> USD, the two Preferred Currencies themselves.
    { baseCurrency: 'USD', quoteCurrency: 'VND', rate: '25000' },
    { baseCurrency: 'VND', quoteCurrency: 'USD', rate: '0.00004' },
    // Every other Supported Currency, ->USD and ->VND (= ->USD * 25,000).
    { baseCurrency: 'EUR', quoteCurrency: 'USD', rate: '1.08' },
    { baseCurrency: 'EUR', quoteCurrency: 'VND', rate: '27000' },
    { baseCurrency: 'GBP', quoteCurrency: 'USD', rate: '1.25' },
    { baseCurrency: 'GBP', quoteCurrency: 'VND', rate: '31250' },
    { baseCurrency: 'JPY', quoteCurrency: 'USD', rate: '0.0065' },
    { baseCurrency: 'JPY', quoteCurrency: 'VND', rate: '162.5' },
    { baseCurrency: 'SGD', quoteCurrency: 'USD', rate: '0.75' },
    { baseCurrency: 'SGD', quoteCurrency: 'VND', rate: '18750' },
    { baseCurrency: 'AUD', quoteCurrency: 'USD', rate: '0.65' },
    { baseCurrency: 'AUD', quoteCurrency: 'VND', rate: '16250' },
    { baseCurrency: 'CAD', quoteCurrency: 'USD', rate: '0.72' },
    { baseCurrency: 'CAD', quoteCurrency: 'VND', rate: '18000' },
    { baseCurrency: 'KRW', quoteCurrency: 'USD', rate: '0.00072' },
    { baseCurrency: 'KRW', quoteCurrency: 'VND', rate: '18' },
    { baseCurrency: 'THB', quoteCurrency: 'USD', rate: '0.0275' },
    { baseCurrency: 'THB', quoteCurrency: 'VND', rate: '687.5' },
  ];

  // Every Supported Currency other than VND/USD themselves must appear
  // exactly twice above (->USD and ->VND); a currency added to the domain
  // list without a fixture here would silently 503 the demo path again.
  const nonIdentityCurrencies = SUPPORTED_CURRENCIES.filter(
    (currency) => currency !== 'VND' && currency !== 'USD',
  );
  for (const currency of nonIdentityCurrencies) {
    const pairs = rows.filter((row) => row.baseCurrency === currency);
    if (pairs.length !== 2) {
      throw new Error(
        `Daily rate fixtures are missing coverage for ${currency} — ` +
          `expected a ->USD and a ->VND row, found ${pairs.length}.`,
      );
    }
  }

  return rows.map((row, index) => ({
    id: `01920000-0000-7000-8100-${String(index + 1).padStart(12, '0')}`,
    rateDate,
    ...row,
  }));
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
 * `convertedAmount` is computed by hand at the `RATE_DATE` rate above (the
 * most recent rate at or before every one of these logging dates) so it is
 * exactly what `ConversionService.convert()` would produce:
 * - VND expenses: identity, convertedAmount == originalAmount.
 * - The USD concert ticket: 50.00 USD * 25000 (USD->VND) = 1,250,000.0000 VND.
 */
const expenses = [
  {
    id: '01920000-0000-7000-8200-000000000001',
    ownerId: YOU_ID,
    description: 'Cà phê với Minh',
    originalAmount: '45000',
    originalCurrency: 'VND' as const,
    convertedAmount: '45000',
    convertedCurrency: 'VND' as const,
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
    convertedAmount: '65000',
    convertedCurrency: 'VND' as const,
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
    convertedAmount: '1250000.0000',
    convertedCurrency: 'VND' as const,
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
    convertedAmount: '5000000',
    convertedCurrency: 'VND' as const,
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
    convertedAmount: '220000',
    convertedCurrency: 'VND' as const,
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
    convertedAmount: '8500000',
    convertedCurrency: 'VND' as const,
    category: 'housing' as const,
    visibility: 'friend_only' as const,
    expenseDate: calendarDateToDate('2026-01-09'),
    loggedAt: new Date('2026-01-09T00:00:00.000Z'), // 07:00 ICT
  },
];

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

  console.log(
    `Seeded ${userCount} of ${users.length} users (the rest existed).`,
  );
  console.log(
    `Seeded ${dailyRateCount} of ${dailyRates.length} daily rates (the rest existed).`,
  );
  console.log(
    `Seeded ${expenseCount} of ${expenses.length} expenses (the rest existed).`,
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
