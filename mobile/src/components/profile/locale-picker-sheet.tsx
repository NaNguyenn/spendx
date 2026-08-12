import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { FlatList, Modal, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { LOCALES, localeDisplayName, type SupportedLocale } from '@/lib/locale';

const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
};

interface LocalePickerSheetProps {
  visible: boolean;
  value: SupportedLocale;
  onSelect: (locale: SupportedLocale) => void;
  onClose: () => void;
}

/**
 * The Profile "Language" row's picker — same bottom-sheet chrome as
 * SelectField's currency picker (form/select-field.tsx), kept as its own
 * component because it lists `LOCALES` rather than a generic option array
 * and is a row's affordance, not a form field's.
 */
export function LocalePickerSheet({
  visible,
  value,
  onSelect,
  onClose,
}: LocalePickerSheetProps) {
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
          data={LOCALES}
          keyExtractor={(locale) => locale}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              style={[styles.optionRow, { borderBottomColor: theme.border }]}
            >
              <ThemedText style={styles.optionLabel}>
                {localeDisplayName(item)}
              </ThemedText>
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
