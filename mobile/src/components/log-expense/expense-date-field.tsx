import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fieldStyles } from '@/components/form/field-styles';
import { PrimaryButton } from '@/components/form/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { formatExpenseDateLabel } from '@/lib/format';

interface ExpenseDateFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  now: Date;
}

const CALENDAR_ICON: SymbolViewProps['name'] = {
  ios: 'calendar',
  android: 'calendar_month',
  web: 'calendar_month',
};

/**
 * Design component `Otzry` ("Component — Field") with a calendar trailing
 * icon, showing "Today · 11 Aug 2026" until the user picks a different day
 * (formatExpenseDateLabel, lib/format.ts).
 *
 * `@expo/ui/community/datetime-picker` (the `@react-native-community/
 * datetimepicker` drop-in — mobile/.claude/skills/expo-ui) diverges enough
 * by platform that one render path doesn't fit both: Android's default
 * `presentation="dialog"` opens its own native dialog on mount and expects
 * the caller to unmount it on confirm/cancel, so it's only ever mounted
 * while `isOpen`. iOS ignores `presentation` and always renders inline, so
 * it needs this component's own sheet chrome (backdrop + Done button)
 * around it instead of relying on native dialog buttons that don't exist
 * there.
 */
export function ExpenseDateField({
  value,
  onChange,
  now,
}: ExpenseDateFieldProps) {
  const theme = useTheme();
  const { locale, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // Only meaningful on iOS's inline picker, which has no native confirm —
  // the value is staged here until "Done" commits it, so canceling (the
  // backdrop) leaves `value` untouched.
  const [draft, setDraft] = useState(value);

  const openPicker = () => {
    setDraft(value);
    setIsOpen(true);
  };

  return (
    <View style={fieldStyles.field}>
      <ThemedText type="label" themeColor="textTertiary">
        {t('expenseForm.dateLabel')}
      </ThemedText>
      <Pressable
        onPress={openPicker}
        style={[
          fieldStyles.box,
          { backgroundColor: theme.surface2, borderColor: theme.border },
        ]}
      >
        <ThemedText style={styles.value}>
          {formatExpenseDateLabel(value, locale, now)}
        </ThemedText>
        <SymbolView
          name={CALENDAR_ICON}
          size={18}
          tintColor={theme.textTertiary}
        />
      </Pressable>

      {isOpen && Platform.OS === 'android' ? (
        <DateTimePicker
          value={value}
          mode="date"
          presentation="dialog"
          onValueChange={(_event, date) => {
            onChange(date);
            setIsOpen(false);
          }}
          onDismiss={() => setIsOpen(false)}
        />
      ) : null}

      {Platform.OS !== 'android' ? (
        <Modal
          visible={isOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsOpen(false)}
        >
          <Pressable
            accessibilityLabel={t('common.close')}
            style={styles.backdrop}
            onPress={() => setIsOpen(false)}
          />
          <SafeAreaView
            edges={['bottom']}
            style={[styles.sheet, { backgroundColor: theme.surface }]}
          >
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              onValueChange={(_event, date) => setDraft(date)}
            />
            <View style={styles.sheetFooter}>
              <PrimaryButton
                label={t('common.done')}
                onPress={() => {
                  onChange(draft);
                  setIsOpen(false);
                }}
              />
            </View>
          </SafeAreaView>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  value: {
    flex: 1,
    fontSize: 15,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
  },
  sheetFooter: {
    padding: Spacing.sp4,
  },
});
