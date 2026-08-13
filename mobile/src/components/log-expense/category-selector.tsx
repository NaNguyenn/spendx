import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CATEGORIES, CATEGORY_META, type Category } from '@/constants/category';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';

interface CategorySelectorProps {
  value: Category;
  onChange: (category: Category) => void;
}

/**
 * Design component `Tgn6k`, "Component — Category Chip", laid out as the
 * mock's two chip rows (3 + 2). `flexWrap` reproduces that without
 * hardcoding which categories share a row — CATEGORIES' own order (housing,
 * food, leisure, investment, other) is what actually determines the wrap
 * point, same result as the mock's two explicit rows for five items at
 * these chip widths.
 */
export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <View style={styles.row}>
      {CATEGORIES.map((category) => (
        <CategoryChip
          key={category}
          category={category}
          selected={category === value}
          onPress={onChange}
        />
      ))}
    </View>
  );
}

function CategoryChip({
  category,
  selected,
  onPress,
}: {
  category: Category;
  selected: boolean;
  onPress: (category: Category) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const meta = CATEGORY_META[category];

  // Selected inverts to the solid category color with on-cat text/icon;
  // unselected uses the category's own "-soft" fill with the category color
  // for icon and text (see the mock's "Leisure" chip vs its neighbours).
  const backgroundColor = selected ? theme[meta.color] : theme[meta.soft];
  const foreground = selected ? theme.onCat : theme[meta.color];

  return (
    <Pressable
      onPress={() => onPress(category)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, { backgroundColor }]}
    >
      <SymbolView name={meta.icon} size={16} tintColor={foreground} />
      {/*
        `numberOfLines={1}` is load-bearing, and only in Vietnamese. A Text's
        min-content width is its *longest word*, so Yoga sized this chip to
        "Giải" and let the label wrap onto a second line the chip is too short
        to show — "Giải trí" rendered as "Giải", "Đầu tư" as "Đầu". Each is a
        different real word rather than a visibly cut one, so there was no
        ellipsis to give it away. Measuring on one line makes the chip's
        intrinsic width the whole label, so an over-wide chip wraps to the next
        row instead, which is what the row's `flexWrap` was there to do.
        English never showed this: none of its labels contain a space.
      */}
      <ThemedText
        numberOfLines={1}
        style={[styles.label, { color: foreground }]}
      >
        {t(meta.labelKey)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.full,
    paddingVertical: 9,
    paddingHorizontal: 14,
    // Pairs with the label's `numberOfLines` (see the comment there): a chip
    // measured at its full single-line width must be allowed to wrap to the
    // next row rather than be squeezed back into whatever space is left.
    flexShrink: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
