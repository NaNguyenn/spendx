import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TranslationKey } from '@/i18n/en';
import { useTranslation } from '@/i18n/translation-context';

/** The floating pill's own height (design component "Dgjgh", Tab Bar, in designs/spendx-mock.pen). */
const TAB_BAR_HEIGHT = 66;

/**
 * What a screen must reserve at its bottom edge to clear the bar: its height
 * plus a gap, so the last row stops short of the pill rather than tucking
 * under it. The bar is an absolutely-positioned overlay, not a native tab
 * bar, so nothing reserves this automatically the way
 * `contentInsetAdjustmentBehavior` does for NativeTabs — every screen with
 * content that can reach the bottom pads by this, whether it scrolls
 * (Profile) or not (PlaceholderScreen). One number rather than two summands
 * callers have to remember to add.
 */
export const TAB_BAR_INSET = TAB_BAR_HEIGHT + Spacing.sp4;

const TAB_ICONS = {
  expenses: { ios: 'receipt', android: 'receipt_long', web: 'receipt_long' },
  leaderboard: {
    ios: 'trophy',
    android: 'emoji_events',
    web: 'emoji_events',
  },
  feed: { ios: 'water.waves', android: 'waves', web: 'waves' },
  profile: { ios: 'person', android: 'person', web: 'person' },
} as const satisfies Record<string, SymbolViewProps['name']>;

const LOG_BUTTON_ICON: SymbolViewProps['name'] = {
  ios: 'plus',
  android: 'add',
  web: 'add',
};

/**
 * The app's single tab bar, native and web alike — this ticket replaces the
 * previous native-tabs-on-native / expo-router-ui-on-web split with one
 * implementation built on `expo-router/ui` (`Tabs`/`TabList`/`TabTrigger`/
 * `TabSlot`).
 *
 * That's a deliberate exception to "prefer native navigators" (see the
 * vercel-react-native-skills navigation rule): a native `UITabBar` /
 * `BottomNavigationView` lays out a fixed row of equal-width items and has
 * no slot for a 54×54 button that floats proud of the bar and sits dead
 * centre — the design (designs/spendx-mock.pen, component "Dgjgh", "Component
 * — Tab Bar") is unambiguously that floating pill, not five native tab
 * items. `expo-router/ui`'s headless primitives are what let one JS
 * implementation own that layout on both platforms instead of maintaining a
 * bespoke native module.
 */
export default function AppTabs() {
  return (
    <Tabs style={styles.flex}>
      <TabSlot style={styles.flex} />
      <TabList asChild>
        <FloatingTabBar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon={TAB_ICONS.expenses} labelKey="tab.expenses" />
          </TabTrigger>
          <TabTrigger name="leaderboard" href="/leaderboard" asChild>
            <TabButton
              icon={TAB_ICONS.leaderboard}
              labelKey="tab.leaderboard"
            />
          </TabTrigger>
          <LogButton />
          <TabTrigger name="feed" href="/feed" asChild>
            <TabButton icon={TAB_ICONS.feed} labelKey="tab.feed" />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon={TAB_ICONS.profile} labelKey="tab.profile" />
          </TabTrigger>
        </FloatingTabBar>
      </TabList>
    </Tabs>
  );
}

/** The pill itself: floats above the safe-area bottom inset, padded off both edges. */
function FloatingTabBar(props: TabListProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: insets.bottom }]}
    >
      <View
        {...props}
        style={[
          styles.pill,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      />
    </View>
  );
}

function TabButton({
  icon,
  labelKey,
  isFocused,
  ...props
}: TabTriggerSlotProps & {
  icon: SymbolViewProps['name'];
  // Derived from the catalogue rather than restated, per the house style —
  // renaming a `tab.*` key breaks this here instead of at the call site.
  labelKey: Extract<TranslationKey, `tab.${string}`>;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const label = t(labelKey);

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      style={styles.tabButton}
    >
      <View
        style={[
          styles.tabButtonInner,
          isFocused && { backgroundColor: theme.accentSoft },
        ]}
      >
        <SymbolView
          name={icon}
          size={21}
          tintColor={isFocused ? theme.accent : theme.textTertiary}
        />
        <ThemedText
          themeColor={isFocused ? 'accent' : 'textTertiary'}
          style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}
        >
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

/**
 * Placeholder action — mobile ticket #5 ("Expense logging UI: Log Button
 * form and Expenses tab list") wires this to the Log Expense sheet. Until
 * then it's a real, focusable, accessible control with the design's visual
 * treatment that intentionally does nothing.
 */
function LogButton() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => {}}
      accessibilityRole="button"
      accessibilityLabel={t('logButton.accessibilityLabel')}
      style={({ pressed }) => [
        styles.logButton,
        { backgroundColor: theme.accent },
        pressed && styles.logButtonPressed,
      ]}
    >
      <SymbolView name={LOG_BUTTON_ICON} size={26} tintColor={theme.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.sp4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    height: TAB_BAR_HEIGHT,
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sp2,
    // Design's outer shadow (#0A0F1E33, y 8, blur 24, spread -6).
    shadowColor: '#0A0F1E',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
  },
  tabButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: Radii.full,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  tabLabelFocused: {
    fontWeight: '700',
  },
  logButton: {
    width: 54,
    height: 54,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    // Design's accent glow (#5B3DF57A, y 8, blur 18, spread -4).
    shadowColor: '#5B3DF5',
    shadowOpacity: 0.48,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  logButtonPressed: {
    opacity: 0.85,
  },
});
