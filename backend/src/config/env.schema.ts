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

  // Which SMTP server EmailModule's EMAIL_SENDER (src/email) delivers
  // through, and the From: header on every message it sends. Left unset
  // here so the .transform below can default them by NODE_ENV: Mailpit
  // (compose.yaml) in development/test, nothing in production — a real
  // relay has no honest default, so production must set these explicitly.
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  EMAIL_FROM: z.string().min(1).optional(),
});

export const envSchema = baseEnvSchema.transform((env, ctx) => {
  const isProduction = env.NODE_ENV === 'production';

  if (isProduction) {
    for (const key of ['SMTP_HOST', 'SMTP_PORT', 'EMAIL_FROM'] as const) {
      if (env[key] === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} has no default in production — set it explicitly (see backend/.env.example).`,
        });
      }
    }
  }

  return {
    ...env,
    DAILY_RATES_PROVIDER:
      env.DAILY_RATES_PROVIDER ?? (isProduction ? 'exchange-api' : 'stub'),
    SMTP_HOST: env.SMTP_HOST ?? 'localhost',
    SMTP_PORT: env.SMTP_PORT ?? 1025,
    EMAIL_FROM: env.EMAIL_FROM ?? 'spendx <no-reply@spendx.local>',
  };
});

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
