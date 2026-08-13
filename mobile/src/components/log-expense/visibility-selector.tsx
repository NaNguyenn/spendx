import { Pressable, StyleSheet, View } from 'react-native';

import { VisibilityBadge } from '@/components/expenses/visibility-badge';
import { ThemedText } from '@/components/themed-text';
import {
  VISIBILITIES,
  VISIBILITY_META,
  type Visibility,
} from '@/constants/visibility';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';

interface VisibilitySelectorProps {
  value: Visibility;
  onChange: (visibility: Visibility) => void;
  /** Interpolated into the selected option's helper sentence ("…with your @username."). */
  username: string;
}

/**
 * Design component `etFA4`, "Component — Visibility Selector": three
 * equal-width cards plus a helper sentence underneath that changes with the
 * selection — the mock only shows Public's wording ("Anyone can see this in
 * the Feed with your @username."); Private's and Friend-only's equivalents
 * live in i18n/en.ts and vi.ts as `visibility.*.helper`.
 */
export function VisibilitySelector({
  value,
  onChange,
  username,
}: VisibilitySelectorProps) {
  const { t } = useTranslation();
  const meta = VISIBILITY_META[value];

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {VISIBILITIES.map((visibility) => (
          <VisibilityOption
            key={visibility}
            visibility={visibility}
            selected={visibility === value}
            onPress={onChange}
          />
        ))}
      </View>
      <ThemedText themeColor="textTertiary" style={styles.helper}>
        {t(meta.helperKey, { username })}
      </ThemedText>
    </View>
  );
}

function VisibilityOption({
  visibility,
  selected,
  onPress,
}: {
  visibility: Visibility;
  selected: boolean;
  onPress: (visibility: Visibility) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const meta = VISIBILITY_META[visibility];

  return (
    <Pressable
      onPress={() => onPress(visibility)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.option,
        {
          backgroundColor: selected ? theme[meta.soft] : theme.surface2,
          borderColor: selected ? theme[meta.color] : theme.border,
          borderWidth: selected ? 1.5 : 1,
        },
      ]}
    >
      <VisibilityBadge visibility={visibility} size={26} />
      <ThemedText
        style={[
          styles.label,
          { color: selected ? theme[meta.color] : theme.textSecondary },
        ]}
      >
        {t(meta.labelKey)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 9,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
    borderRadius: Radii.md,
    paddingVertical: 13,
    paddingHorizontal: 6,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'center',
  },
  helper: {
    fontSize: 11.5,
    lineHeight: 16,
  },
});
