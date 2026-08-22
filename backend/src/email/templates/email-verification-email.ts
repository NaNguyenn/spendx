import type { Locale } from '../../domain/locale';

export interface EmailVerificationEmailParams {
  code: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
}

/**
 * Establishes the template-function pattern for `src/email/templates`: a
 * plain function of `(Locale, params) -> { subject, text }`, exhaustive over
 * `LOCALES` via the `Record` below. A Locale added to `src/domain/locale.ts`
 * fails this file to compile until it is handled here too — the same
 * exhaustiveness discipline `src/domain/locale.ts` uses for the Prisma enum.
 *
 * Keyed off the account's Locale (backend/CONTEXT.md — Locale: "localizes
 * ... templates"), never the request's headers — Locale is the stored,
 * server-side source of truth for what language a User's emails speak in.
 */
export function renderEmailVerificationEmail(
  locale: Locale,
  params: EmailVerificationEmailParams,
): RenderedEmail {
  return TEMPLATES[locale](params);
}

const TEMPLATES: Record<
  Locale,
  (params: EmailVerificationEmailParams) => RenderedEmail
> = {
  en: ({ code }) => ({
    subject: 'Verify your spendx email',
    text: [
      'Hi,',
      '',
      'Use this code to verify your email address for spendx:',
      '',
      code,
      '',
      "This code expires in 24 hours. If you didn't request this, you can " +
        'safely ignore this email.',
    ].join('\n'),
  }),
  vi: ({ code }) => ({
    subject: 'Xác minh email spendx của bạn',
    text: [
      'Chào bạn,',
      '',
      'Dùng mã này để xác minh địa chỉ email của bạn cho spendx:',
      '',
      code,
      '',
      'Mã sẽ hết hạn sau 24 giờ. Nếu bạn không yêu cầu việc này, bạn có thể ' +
        'bỏ qua email này.',
    ].join('\n'),
  }),
};
