import { getLocales } from 'expo-localization';
import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';

import { useSession } from '@/auth/session-context';
import { en, type TranslationKey } from '@/i18n/en';
import { vi } from '@/i18n/vi';
import { resolveSignupLocale, type SupportedLocale } from '@/lib/locale';

const CATALOGUES: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en,
  vi,
};

interface TranslationContextValue {
  /** The account Locale when signed in, else the resolved device language. */
  locale: SupportedLocale;
  /**
   * `params` fills in `{name}` placeholders in the catalogue string — e.g.
   * `visibility.public.helper`'s "…with your @{username}." (mobile ticket
   * #5 is the first string that needs one; every earlier key has none, so
   * omitting `params` is still the common case). Unmatched placeholders are
   * left as-is rather than throwing — a missing param is a bug worth seeing
   * on screen, not one that should crash the form.
   */
  t: (key: TranslationKey, params?: Record<string, string>) => string;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

/**
 * The active Locale is the signed-in account's — persisted server-side so it
 * also drives emails (backend/CONTEXT.md's Locale entry) — and falls back to
 * the device language before sign-in, via the same `resolveSignupLocale`
 * mobile ticket #2 uses to default a new account's Locale. That fallback is
 * what lets the auth screens be localized before there is a session to read.
 *
 * Must render inside SessionProvider; sits above ThemeProvider in the root
 * layout so a Locale change (SessionContext#updateLocale) re-renders every
 * translated string in the tree.
 */
export function TranslationProvider({ children }: PropsWithChildren) {
  const { user } = useSession();

  const locale = useMemo<SupportedLocale>(() => {
    if (user) return user.locale;
    return resolveSignupLocale(getLocales().map((entry) => entry.languageCode));
  }, [user]);

  const value = useMemo<TranslationContextValue>(
    () => ({
      locale,
      t: (key, params) => {
        const template = CATALOGUES[locale][key];
        if (!params) return template;
        return template.replace(/{(\w+)}/g, (match, name: string) =>
          Object.prototype.hasOwnProperty.call(params, name)
            ? params[name]
            : match,
        );
      },
    }),
    [locale],
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation(): TranslationContextValue {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
