import React from 'react';
import { ActivityIndicator, GestureResponderEvent, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { palette } from '@mobile/theme/colors';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}

export function Button({ label, variant = 'primary', loading = false, disabled, style, ...rest }: ButtonProps) {
  const colors = getColors(variant, disabled);
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: colors.background,
          paddingVertical: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        },
        style,
      ]}
      {...rest}
    >
      {loading && <ActivityIndicator color={colors.text} />}
      <Text
        style={{
          color: colors.text,
          fontWeight: '600',
          fontSize: 16,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const getColors = (variant: ButtonProps['variant'], disabled?: boolean) => {
  if (disabled) {
    return {
      background: palette.surfaceAlt,
      border: palette.border,
      text: palette.textMuted,
    };
  }

  if (variant === 'secondary') {
    return {
      background: palette.surface,
      border: palette.border,
      text: palette.textPrimary,
    };
  }

  if (variant === 'ghost') {
    return {
      background: 'transparent',
      border: 'transparent',
      text: palette.textSecondary,
    };
  }

  return {
    background: palette.primary,
    border: palette.primary,
    text: '#050506',
  };
};
