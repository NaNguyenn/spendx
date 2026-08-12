import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The chrome every Auth screen shares: a keyboard-aware, centred, scrollable
 * column under the brand mark and a title/subtitle pair.
 *
 * Sign In and Sign Up differ only in their fields and their buttons; keeping
 * the frame here means the next auth screen (password reset, verification)
 * inherits the layout instead of copying it a third time.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  const theme = useTheme();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: 'padding', default: undefined })}
    >
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.background }]}
        edges={['top', 'bottom']}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <BrandMark />

          <View style={styles.headerBlock}>
            <ThemedText type="title">{title}</ThemedText>
            <ThemedText type="subtitle" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          </View>

          {children}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

/** The stack of inputs, spaced consistently across auth screens. */
export function FieldGroup({ children }: PropsWithChildren) {
  return <View style={styles.fields}>{children}</View>;
}

/** The "or" rule between the primary action and the way to the other screen. */
export function OrDivider() {
  const theme = useTheme();

  return (
    <View style={styles.divider}>
      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      <ThemedText themeColor="textTertiary" style={styles.dividerText}>
        or
      </ThemedText>
      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
    </View>
  );
}

/** A whole-form error, as opposed to one attached to a single field. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <ThemedText themeColor="danger" style={styles.error}>
      {message}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sp6,
    paddingVertical: Spacing.sp8,
    gap: Spacing.sp6,
  },
  headerBlock: {
    gap: Spacing.sp2,
  },
  fields: {
    gap: Spacing.sp4,
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sp3,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
