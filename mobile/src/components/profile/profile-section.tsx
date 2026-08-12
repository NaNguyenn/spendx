import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const CHEVRON_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
};

export interface ProfileRowItem {
  key: string;
  icon: SymbolViewProps['name'];
  label: string;
  value: string;
  /** Present only for rows this ticket makes editable (currently just Language) — see profile.tsx. */
  onPress?: () => void;
  disabled?: boolean;
}

interface ProfileSectionProps {
  caption: string;
  rows: readonly ProfileRowItem[];
}

/** Uppercase caption above a surface card of rows — PREFERENCES / ACCOUNT. */
export function ProfileSection({ caption, rows }: ProfileSectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="label" themeColor="textTertiary">
        {caption}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        {rows.map((row, index) => (
          <Fragment key={row.key}>
            {index > 0 ? (
              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />
            ) : null}
            <ProfileRow
              icon={row.icon}
              label={row.label}
              value={row.value}
              onPress={row.onPress}
              disabled={row.disabled}
            />
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  onPress,
  disabled,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  value: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  const content = (
    <>
      <View style={[styles.iconDisc, { backgroundColor: theme.surface2 }]}>
        <SymbolView name={icon} size={16} tintColor={theme.textSecondary} />
      </View>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <ThemedText
        style={styles.rowValue}
        themeColor="textSecondary"
        numberOfLines={1}
      >
        {value}
      </ThemedText>
      {onPress ? (
        <SymbolView
          name={CHEVRON_ICON}
          size={16}
          tintColor={theme.textTertiary}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sp2,
  },
  card: {
    borderRadius: Radii.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.sp4 + 32 + Spacing.sp3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sp3,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  iconDisc: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '45%',
  },
  pressed: {
    opacity: 0.6,
  },
});
