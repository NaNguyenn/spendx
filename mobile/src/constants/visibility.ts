import type { SymbolViewProps } from 'expo-symbols';

import type { components } from '@/api/schema';
import type { ThemeColor } from '@/constants/theme';
import type { TranslationKey } from '@/i18n/en';

/**
 * The Visibility value set, taken from the generated contract rather than
 * restated here (ADR-0007) — same `satisfies` + exhaustiveness-check pattern
 * as constants/category.ts.
 */
export type Visibility = components['schemas']['Visibility'];

export const VISIBILITIES = [
  'private',
  'friend_only',
  'public',
] as const satisfies readonly Visibility[];

type MissingVisibility = Exclude<Visibility, (typeof VISIBILITIES)[number]>;

/** Compiles only while `T` is `never`, and names `T` in the error when it is not. */
type AssertNone<T extends never> = T;

export type EveryVisibilityIsListed = AssertNone<MissingVisibility>;

/**
 * Per-visibility presentation for the Visibility Selector (Log Expense) and
 * the Visibility Badge (Expense Row): label, icon, theme tokens, and the
 * helper sentence under the selector — `helperKey`'s string takes a
 * `{username}` param (TranslationProvider's `t` — see i18n/en.ts) filled in
 * with the signed-in user's own handle, since "with your @username" is only
 * ever about the account doing the logging.
 */
export const VISIBILITY_META: Record<
  Visibility,
  {
    labelKey: TranslationKey;
    helperKey: TranslationKey;
    icon: SymbolViewProps['name'];
    color: ThemeColor;
    soft: ThemeColor;
  }
> = {
  private: {
    labelKey: 'visibility.private',
    helperKey: 'visibility.private.helper',
    icon: { ios: 'lock', android: 'lock', web: 'lock' },
    color: 'visPrivate',
    soft: 'visPrivateSoft',
  },
  friend_only: {
    labelKey: 'visibility.friendOnly',
    helperKey: 'visibility.friendOnly.helper',
    icon: { ios: 'person.2', android: 'group', web: 'group' },
    color: 'visFriends',
    soft: 'visFriendsSoft',
  },
  public: {
    labelKey: 'visibility.public',
    helperKey: 'visibility.public.helper',
    icon: { ios: 'globe', android: 'public', web: 'public' },
    color: 'visPublic',
    soft: 'visPublicSoft',
  },
};
