import { z } from 'zod';

/**
 * The complete set of environment variables this application reads.
 *
 * Parsed once at boot by ConfigModule (see config.module.ts). A missing or
 * malformed variable fails the process immediately with a message naming the
 * variable — the alternative is an undefined that surfaces as a null deref
 * inside a request handler, or worse, a test run pointed at the development
 * database.
 */
const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  // Signs and verifies session tokens (src/auth).
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().min(1).default('90d'),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  // Which DailyRateProvider binding daily-rates.module.ts wires up (see
  // ExchangeApiDailyRateProvider / StubDailyRateProvider). Left unset here so
  // the .transform below can default it by NODE_ENV instead of by a fixed
  // default — production gets the real pipeline with zero config, dev/test
  // stay on the honestly-empty stub unless explicitly opted in.
  DAILY_RATES_PROVIDER: z.enum(['exchange-api', 'stub']).optional(),
  // How many days before today DailyRateSnapshotJob.catchUp() backfills on
  // every boot and cron run, bounding how much a missed run (or a fresh
  // deployment) tries to fetch at once.
  DAILY_RATES_BACKFILL_DAYS: z.coerce.number().int().min(0).default(7),
});

export const envSchema = baseEnvSchema.transform((env) => ({
  ...env,
  DAILY_RATES_PROVIDER:
    env.DAILY_RATES_PROVIDER ??
    (env.NODE_ENV === 'production' ? 'exchange-api' : 'stub'),
}));

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Invalid environment configuration:\n${problems}\n` +
        'See backend/.env.example for the expected values.',
    );
  }

  return result.data;
}
