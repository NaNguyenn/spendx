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
export const envSchema = z.object({
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
