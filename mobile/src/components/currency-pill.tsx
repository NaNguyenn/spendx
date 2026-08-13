import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { SupportedCurrency } from '@/constants/currency';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { currencySymbol } from '@/lib/format';

const CHEVRON_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.down',
  android: 'expand_more',
  web: 'expand_more',
};

interface CurrencyPillProps {
  currency: SupportedCurrency;
  /** Present to make the pill tappable (the Amount Input's currency picker); omitted, it's read-only (the Expenses header). */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Design component `gkLbq`, "Component — Currency Pill": symbol + code +
 * an optional chevron. Two call sites — a read-only badge in the Expenses
 * header (the signed-in Preferred Currency) and a tappable trigger inside
 * the Amount Input (opens `CurrencyPickerSheet`) — hence `onPress` being
 * optional rather than two near-duplicate components.
 */
export function CurrencyPill({ currency, onPress, style }: CurrencyPillProps) {
  const theme = useTheme();
  const { locale } = useTranslation();

  const content = (
    <>
      <ThemedText style={[styles.symbol, { color: theme.textSecondary }]}>
        {currencySymbol(currency, locale)}
      </ThemedText>
      <ThemedText style={styles.code}>{currency}</ThemedText>
      {onPress ? (
        <SymbolView
          name={CHEVRON_ICON}
          size={15}
          tintColor={theme.textTertiary}
        />
      ) : null}
    </>
  );

  const pillStyle = [
    styles.pill,
    { backgroundColor: theme.surface2, borderColor: theme.borderStrong },
    style,
  ];

  if (!onPress) {
    return <View style={pillStyle}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [pillStyle, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 9,
    paddingHorizontal: Spacing.sp3,
  },
  pressed: {
    opacity: 0.7,
  },
  symbol: {
    fontSize: 14,
    fontWeight: '700',
  },
  code: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
