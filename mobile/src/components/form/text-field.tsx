import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fieldStyles } from '@/components/form/field-styles';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type TextFieldProps = Omit<TextInputProps, 'placeholderTextColor'> & {
  label: string;
  error?: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(
  function TextField({ label, error, style, ...inputProps }, ref) {
    const theme = useTheme();

    return (
      <View style={fieldStyles.field}>
        <ThemedText type="label" themeColor="textTertiary">
          {label}
        </ThemedText>
        <View
          style={[
            fieldStyles.box,
            {
              backgroundColor: theme.surface2,
              borderColor: error ? theme.danger : theme.border,
            },
          ]}
        >
          <TextInput
            ref={ref}
            style={[styles.input, { color: theme.text }, style]}
            placeholderTextColor={theme.textTertiary}
            {...inputProps}
          />
        </View>
        {error ? (
          <ThemedText themeColor="danger" style={fieldStyles.error}>
            {error}
          </ThemedText>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
});
