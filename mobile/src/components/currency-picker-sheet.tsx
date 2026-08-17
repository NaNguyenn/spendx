import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { FlatList, Modal, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '@/constants/currency';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';

const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
};

interface CurrencyPickerSheetProps {
  visible: boolean;
  value: SupportedCurrency;
  onSelect: (currency: SupportedCurrency) => void;
  onClose: () => void;
}

/**
 * The Supported Currency picker, shared by the Amount Input (an Original
 * Amount's currency) and Profile (Preferred Currency) — same bottom-sheet
 * chrome as SelectField's (form/select-field.tsx) and Profile's
 * LocalePickerSheet, kept as its own component for the same reason
 * LocalePickerSheet is: it lists `SUPPORTED_CURRENCIES` specifically rather
 * than a generic option array.
 */
export function CurrencyPickerSheet({
  visible,
  value,
  onSelect,
  onClose,
}: CurrencyPickerSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel={t('common.close')}
        style={styles.backdrop}
        onPress={onClose}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.sheet, { backgroundColor: theme.surface }]}
      >
        <FlatList
          data={SUPPORTED_CURRENCIES}
          keyExtractor={(currency) => currency}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              style={[styles.optionRow, { borderBottomColor: theme.border }]}
            >
              <ThemedText style={styles.optionLabel}>{item}</ThemedText>
              {item === value ? (
                <SymbolView
                  name={CHECK_ICON}
                  size={18}
                  tintColor={theme.accent}
                />
              ) : null}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '60%',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sp4,
    paddingHorizontal: Spacing.sp5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: {
    fontSize: 15,
  },
});
