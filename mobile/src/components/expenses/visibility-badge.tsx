import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { VISIBILITY_META } from '@/constants/visibility';
import type { Visibility } from '@/constants/visibility';
import { useTheme } from '@/hooks/use-theme';

interface VisibilityBadgeProps {
  visibility: Visibility;
  /** 22 in the Expense Row (design's `XL64R`), 26 in the Visibility Selector's own Badge. */
  size?: number;
}

/**
 * The small disc-with-glyph badge the design uses twice: 22px in the Expense
 * Row's meta line, 26px as the Visibility Selector's own icon. The mock's
 * "Ring" layer is a partial-sweep arc per Visibility (full circle for
 * Private, a 270° arc for Friend-only, 150° for Public) — a decorative
 * flourish that would need an SVG arc, not a plain View border. Simplified
 * to a full solid ring in the Visibility color; close at these sizes (22–26px)
 * and avoids pulling in an SVG dependency for one detail.
 */
export function VisibilityBadge({
  visibility,
  size = 22,
}: VisibilityBadgeProps) {
  const theme = useTheme();
  const meta = VISIBILITY_META[visibility];
  const iconSize = Math.round(size * 0.45);

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme[meta.soft],
          borderColor: theme[meta.color],
        },
      ]}
    >
      <SymbolView
        name={meta.icon}
        size={iconSize}
        tintColor={theme[meta.color]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
