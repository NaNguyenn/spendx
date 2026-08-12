import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ProfileRowItem {
  key: string;
  icon: SymbolViewProps['name'];
  label: string;
  value: string;
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
            <ProfileRow icon={row.icon} label={row.label} value={row.value} />
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
}: {
  icon: SymbolViewProps['name'];
  label: string;
  value: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
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
    </View>
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
});
