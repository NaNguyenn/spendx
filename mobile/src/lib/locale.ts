import type { components } from '@/api/schema';

/**
 * The Locale value set, taken from the generated contract rather than restated
 * here (ADR-0007) — the backend owns which languages an account can be in.
 */
export type SupportedLocale = components['schemas']['Locale'];

/**
 * The same value set at runtime. As in constants/currency.ts, `satisfies` plus
 * the exhaustiveness check below is what keeps this from drifting: neither a
 * Locale the API rejects nor the omission of one it accepts will compile.
 */
export const LOCALES = [
  'en',
  'vi',
] as const satisfies readonly SupportedLocale[];

type MissingLocale = Exclude<SupportedLocale, (typeof LOCALES)[number]>;

/** Compiles only while `T` is `never`, and names `T` in the error when it is not. */
type AssertNone<T extends never> = T;

export type EveryLocaleIsListed = AssertNone<MissingLocale>;

const LOCALE_DISPLAY_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
};

export function localeDisplayName(locale: SupportedLocale): string {
  return LOCALE_DISPLAY_NAMES[locale];
}

/**
 * Maps the device's language, in priority order, to a supported Locale,
 * defaulting to `en` for anything else. Two callers: sign-up, which sends
 * this as the new account's Locale, and TranslationProvider, which uses it as
 * the active locale while signed out — once there is a session, the account's
 * own Locale wins and the device language stops mattering.
 */
export function resolveSignupLocale(
  languageCodes: readonly (string | null | undefined)[],
): SupportedLocale {
  const primary = languageCodes.find((code): code is string => Boolean(code));
  return primary?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}
