import React from 'react';
import { View, Text } from 'react-native';
import { cssInterop } from 'nativewind';
import { cva, type VariantProps } from 'class-variance-authority';
import { Ionicons } from '@expo/vector-icons';

const StyledIcon = cssInterop(Ionicons, { className: 'style' });

const badgeVariants = cva(
  'flex-row items-center self-start rounded-lg px-2 py-1',
  {
    variants: {
      variant: {
        success: 'bg-green-100',
        warning: 'bg-amber-100',
        error: 'bg-red-100',
        info: 'bg-blue-100',
        neutral: 'bg-gray-100',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

const badgeTextVariants = cva('text-xs font-semibold', {
  variants: {
    variant: {
      success: 'text-green-800',
      warning: 'text-amber-800',
      error: 'text-red-800',
      info: 'text-blue-800',
      neutral: 'text-gray-700',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

const badgeIconVariants = cva('', {
  variants: {
    variant: {
      success: 'text-green-600',
      warning: 'text-amber-600',
      error: 'text-red-600',
      info: 'text-blue-600',
      neutral: 'text-gray-500',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  className?: string;
  type?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant,
  label,
  icon,
  className = '',
}) => {
  return (
    <View className={badgeVariants({ variant, className })}>
      {icon && (
        <StyledIcon
          name={icon}
          size={14}
          className={`${badgeIconVariants({ variant })} mr-1`}
        />
      )}
      <Text className={badgeTextVariants({ variant })}>{label}</Text>
    </View>
  );
};
