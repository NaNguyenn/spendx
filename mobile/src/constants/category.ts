import type { SymbolViewProps } from 'expo-symbols';

import type { components } from '@/api/schema';
import type { ThemeColor } from '@/constants/theme';
import type { TranslationKey } from '@/i18n/en';

/**
 * The Category value set, taken from the generated contract rather than
 * restated here (ADR-0007) — same `satisfies` + exhaustiveness-check pattern
 * as constants/currency.ts and lib/locale.ts.
 */
export type Category = components['schemas']['Category'];

export const CATEGORIES = [
  'housing',
  'food',
  'leisure',
  'investment',
  'other',
] as const satisfies readonly Category[];

type MissingCategory = Exclude<Category, (typeof CATEGORIES)[number]>;

/** Compiles only while `T` is `never`, and names `T` in the error when it is not. */
type AssertNone<T extends never> = T;

export type EveryCategoryIsListed = AssertNone<MissingCategory>;

/**
 * Per-category presentation: the label key (Log Expense's chip row and the
 * Expenses list both need the localized name), the icon (design's lucide
 * names mapped to the nearest SF Symbol / Material Symbol, same convention
 * as app-tabs.tsx/profile.tsx), and which theme tokens the Category Tile
 * (Expense Row) and Category Chip (Log Expense) pull their colors from —
 * `catHousing`/`catHousingSoft` etc. added to constants/theme.ts for this
 * ticket.
 */
export const CATEGORY_META: Record<
  Category,
  {
    labelKey: TranslationKey;
    icon: SymbolViewProps['name'];
    color: ThemeColor;
    soft: ThemeColor;
  }
> = {
  housing: {
    labelKey: 'category.housing',
    icon: { ios: 'house', android: 'home', web: 'home' },
    color: 'catHousing',
    soft: 'catHousingSoft',
  },
  food: {
    labelKey: 'category.food',
    icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
    color: 'catFood',
    soft: 'catFoodSoft',
  },
  leisure: {
    labelKey: 'category.leisure',
    icon: {
      ios: 'party.popper',
      android: 'celebration',
      web: 'celebration',
    },
    color: 'catLeisure',
    soft: 'catLeisureSoft',
  },
  investment: {
    labelKey: 'category.investment',
    icon: {
      ios: 'chart.line.uptrend.xyaxis',
      android: 'trending_up',
      web: 'trending_up',
    },
    color: 'catInvestment',
    soft: 'catInvestmentSoft',
  },
  other: {
    labelKey: 'category.other',
    icon: {
      ios: 'square.grid.2x2',
      android: 'category',
      web: 'category',
    },
    color: 'catOther',
    soft: 'catOtherSoft',
  },
};
