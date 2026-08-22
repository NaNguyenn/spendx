import type { Locale } from '../../domain/locale';
import type { RenderedEmail } from './rendered-email';

export interface PasswordResetEmailParams {
  code: string;
}

/**
 * Follows the template-function pattern established by
 * `email-verification-email.ts`: a plain function of `(Locale, params) ->
 * { subject, text }`, exhaustive over `LOCALES` via the `Record` below, keyed
 * off the stored account Locale — never the request's headers. The code sits
 * on its own line, which the e2e suite's `extractCode` helper relies on.
 */
export function renderPasswordResetEmail(
  locale: Locale,
  params: PasswordResetEmailParams,
): RenderedEmail {
  return TEMPLATES[locale](params);
}

const TEMPLATES: Record<
  Locale,
  (params: PasswordResetEmailParams) => RenderedEmail
> = {
  en: ({ code }) => ({
    subject: 'Reset your spendx password',
    text: [
      'Hi,',
      '',
      'Use this code to reset your spendx password:',
      '',
      code,
      '',
      "This code expires in 15 minutes. If you didn't request this, you can " +
        'safely ignore this email — your password is unchanged.',
    ].join('\n'),
  }),
  vi: ({ code }) => ({
    subject: 'Đặt lại mật khẩu spendx của bạn',
    text: [
      'Chào bạn,',
      '',
      'Dùng mã này để đặt lại mật khẩu spendx của bạn:',
      '',
      code,
      '',
      'Mã sẽ hết hạn sau 15 phút. Nếu bạn không yêu cầu việc này, bạn có thể ' +
        'bỏ qua email này — mật khẩu của bạn không thay đổi.',
    ].join('\n'),
  }),
};
