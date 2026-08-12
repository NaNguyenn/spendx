import { StyleSheet } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';

/**
 * Shared "Field" box anatomy from the design system: column, gap 7; box fill
 * surface-2, radius r-lg, 1px border, padding 14/16, gap 10. Used by both
 * TextField and SelectField so the two stay visually identical.
 */
export const fieldStyles = StyleSheet.create({
  field: {
    gap: 7,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sp3,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: Spacing.sp4,
  },
  error: {
    fontSize: 12,
    fontWeight: '600',
  },
});
