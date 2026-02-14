import React, { PropsWithChildren } from 'react';
import { View, ViewProps } from 'react-native';
import { palette, shadows } from '@mobile/theme/colors';

interface SurfaceCardProps extends ViewProps {
  variant?: 'default' | 'elevated';
}

export function SurfaceCard({ children, variant = 'default', style, ...rest }: PropsWithChildren<SurfaceCardProps>) {
  return (
    <View
      style={[
        {
          backgroundColor: variant === 'elevated' ? palette.surfaceAlt : palette.surface,
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: palette.border,
          ...(variant === 'elevated' ? shadows.card : {}),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
