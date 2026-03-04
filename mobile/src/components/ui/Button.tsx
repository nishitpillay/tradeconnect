import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { cssInterop } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { cva, type VariantProps } from 'class-variance-authority';

const StyledIcon = cssInterop(Ionicons, { className: 'style' });

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-lg',
  {
    variants: {
      variant: {
        primary: 'bg-blue-500',
        secondary: 'bg-gray-100',
        outline: 'border border-blue-500 bg-transparent',
        ghost: 'bg-transparent',
        danger: 'bg-red-500',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-11 px-4',
        lg: 'h-13 px-5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

const buttonTextVariants = cva('font-semibold', {
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'text-gray-900',
      outline: 'text-blue-500',
      ghost: 'text-blue-500',
      danger: 'text-white',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  variant,
  size,
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onPress,
  children,
  className = '',
  style,
}) => {
  const isDisabled = disabled || loading;

  const textVariant = variant;
  const textSize = size;

  const iconSize = {
    sm: 20,
    md: 24,
    lg: 28,
  }[size || 'md'];

  return (
    <TouchableOpacity
      className={`${buttonVariants({ variant, size })} ${
        fullWidth ? 'w-full' : ''
      } ${isDisabled ? 'opacity-50' : ''} ${className}`}
      style={style}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          className="mr-2"
        />
      ) : (
        leftIcon && (
          <StyledIcon
            name={leftIcon}
            size={iconSize}
            className={`${buttonTextVariants({ variant: textVariant, size: textSize })} mr-2`}
          />
        )
      )}
      <Text
        className={buttonTextVariants({ variant: textVariant, size: textSize })}
      >
        {children}
      </Text>
      {!loading &&
        rightIcon && (
          <StyledIcon
            name={rightIcon}
            size={iconSize}
            className={`${buttonTextVariants({ variant: textVariant, size: textSize })} ml-2`}
          />
        )}
    </TouchableOpacity>
  );
};
