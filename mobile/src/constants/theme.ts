/**
 * Design tokens for the app, taken from the `Design System — spendx` sheet in
 * designs/spendx-mock.pen (light / dark). `Colors[scheme]` is the accessor
 * every themed component uses — see hooks/use-theme.ts.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#F4F5F9',
    surface: '#FFFFFF',
    surface2: '#ECEDF3',
    surface3: '#E2E4ED',
    border: '#E3E5EE',
    borderStrong: '#CFD2DF',
    text: '#101219',
    textSecondary: '#666C7E',
    textTertiary: '#9BA1B2',
    accent: '#5B3DF5',
    accentPress: '#4A2FD6',
    accentSoft: '#E9E5FE',
    onAccent: '#FFFFFF',
    success: '#0EA46E',
    successSoft: '#DCF6EC',
    danger: '#E23D5A',
    dangerSoft: '#FDE6EA',
    warn: '#E08A00',
    // Rank 1/2/3 badge fills (design system's "Brand & status" swatches) —
    // the Leaderboard's Rank Row (mobile ticket #12) is their only user.
    gold: '#E0A413',
    silver: '#9AA2B4',
    bronze: '#BE7A45',
    visPrivate: '#5A6070',
    visPrivateSoft: '#E6E8EF',
    visFriends: '#C2820A',
    visFriendsSoft: '#FBEFD3',
    visPublic: '#0B8FA8',
    visPublicSoft: '#D9F1F7',
    catHousing: '#2E6BE6',
    catHousingSoft: '#E1EBFD',
    catFood: '#E5670B',
    catFoodSoft: '#FDEBDD',
    catLeisure: '#D6318E',
    catLeisureSoft: '#FCE4F1',
    catInvestment: '#0F9B72',
    catInvestmentSoft: '#DCF4ED',
    catOther: '#6E7488',
    catOtherSoft: '#E8EAF1',
    onCat: '#FFFFFF',
  },
  dark: {
    background: '#0D0E13',
    surface: '#171921',
    surface2: '#20232D',
    surface3: '#292D39',
    border: '#2B2F3B',
    borderStrong: '#3A3F4E',
    text: '#F5F6FA',
    textSecondary: '#9CA2B4',
    textTertiary: '#6C7284',
    accent: '#8570FF',
    accentPress: '#6E58F0',
    accentSoft: '#241F4D',
    onAccent: '#0D0E13',
    success: '#2ED89A',
    successSoft: '#0E3A2B',
    danger: '#FF6B84',
    dangerSoft: '#40151F',
    warn: '#FFB833',
    gold: '#FFC94A',
    silver: '#B9C0D0',
    bronze: '#D9925B',
    visPrivate: '#98A0B5',
    visPrivateSoft: '#262A34',
    visFriends: '#FFC24D',
    visFriendsSoft: '#3D2E06',
    visPublic: '#3ED2EE',
    visPublicSoft: '#07333D',
    catHousing: '#6699FF',
    catHousingSoft: '#16294D',
    catFood: '#FF9245',
    catFoodSoft: '#412104',
    catLeisure: '#FF74BC',
    catLeisureSoft: '#43112F',
    catInvestment: '#33D6A4',
    catInvestmentSoft: '#0B3A2C',
    catOther: '#98A0B5',
    catOtherSoft: '#282C37',
    onCat: '#12131A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** `sp-1..sp-8` from the design system. */
export const Spacing = {
  sp1: 4,
  sp2: 8,
  sp3: 12,
  sp4: 16,
  sp5: 20,
  sp6: 24,
  sp7: 32,
  sp8: 40,
} as const;

/** `r-sm..r-full` from the design system. */
export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

export const MaxContentWidth = 480;
