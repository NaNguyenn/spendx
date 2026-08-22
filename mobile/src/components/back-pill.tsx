import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'chevron_left',
  web: 'chevron_left',
};

/**
 * The circular back affordance every pushed screen shares
 * (blocked-accounts.tsx's header, AuthScreen's `onBack` chrome). One
 * component rather than a copied pill per screen, so the geometry and the
 * `common.back` accessibility name cannot drift apart; the surrounding
 * header layout stays each screen's own.
 */
export function BackPill({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      style={[
        styles.pill,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <SymbolView name={BACK_ICON} size={16} tintColor={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
