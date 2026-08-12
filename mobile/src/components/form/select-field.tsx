import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fieldStyles } from '@/components/form/field-styles';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SelectFieldOption<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly SelectFieldOption<T>[];
  onChange: (value: T) => void;
}

const CHEVRON_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.down',
  android: 'expand_more',
  web: 'expand_more',
};

const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
};

/** A Field-shaped Pressable that opens a modal list of options — used for Preferred Currency. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={fieldStyles.field}>
      <ThemedText type="label" themeColor="textTertiary">
        {label}
      </ThemedText>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={[
          fieldStyles.box,
          { backgroundColor: theme.surface2, borderColor: theme.border },
        ]}
      >
        <ThemedText style={styles.value}>{selected?.label ?? value}</ThemedText>
        <SymbolView
          name={CHEVRON_ICON}
          size={18}
          tintColor={theme.textTertiary}
        />
      </Pressable>

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          accessibilityLabel="Close"
          style={styles.backdrop}
          onPress={() => setIsOpen(false)}
        />
        <SafeAreaView
          edges={['bottom']}
          style={[styles.sheet, { backgroundColor: theme.surface }]}
        >
          <FlatList
            data={options}
            keyExtractor={(option) => option.value}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  setIsOpen(false);
                }}
                style={[styles.optionRow, { borderBottomColor: theme.border }]}
              >
                <ThemedText style={styles.optionLabel}>{item.label}</ThemedText>
                {item.value === value ? (
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
