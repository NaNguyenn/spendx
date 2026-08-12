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
 * Maps the device's language, in priority order, to one of the two Locales
 * this ticket supports — defaulting to `en` for anything else. This is the
 * *only* thing this ticket does with device language: no switcher, no
 * translated UI (both are later tickets).
 */
export function resolveSignupLocale(
  languageCodes: readonly (string | null | undefined)[],
): SupportedLocale {
  const primary = languageCodes.find((code): code is string => Boolean(code));
  return primary?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}
