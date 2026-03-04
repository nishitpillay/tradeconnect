import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { cssInterop } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

const StyledIcon = cssInterop(Ionicons, { className: 'style' });

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  type?: 'text' | 'email' | 'phone' | 'password' | 'number';
  multiline?: boolean;
  maxLength?: number;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  required?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: any;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  type = 'text',
  multiline = false,
  maxLength,
  leftIcon,
  rightIcon,
  disabled = false,
  required = false,
  autoCapitalize = 'none',
  autoComplete = 'off',
  className = '',
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const getKeyboardType = () => {
    switch (type) {
      case 'email':
        return 'email-address';
      case 'phone':
        return 'phone-pad';
      case 'number':
        return 'numeric';
      default:
        return 'default';
    }
  };

  const isPasswordType = type === 'password';
  const secureTextEntry = isPasswordType && !showPassword;

  const containerClasses = `mb-4 ${className}`;
  const labelClasses = 'text-sm font-medium text-gray-900 mb-1.5';
  const requiredClasses = 'text-red-500';
  const inputContainerClasses = `
    flex-row items-center bg-white border border-gray-200 rounded-lg px-3
    ${error ? 'border-red-500' : ''}
    ${disabled ? 'bg-gray-100' : ''}
  `;
  const inputClasses = `
    flex-1 h-11 text-base text-gray-900 py-2.5
    ${multiline ? 'h-25 text-top py-3' : ''}
    ${leftIcon ? 'pl-0' : ''}
  `;
  const iconClasses = 'text-gray-400';
  const errorTextClasses = 'text-xs text-red-500 mt-1';

  return (
    <View className={containerClasses}>
      {label && (
        <Text className={labelClasses}>
          {label}
          {required && <Text className={requiredClasses}> *</Text>}
        </Text>
      )}
      <View className={inputContainerClasses}>
        {leftIcon && <StyledIcon name={leftIcon} size={20} className={`${iconClasses} mr-2`} />}
        <TextInput
          className={inputClasses}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          keyboardType={getKeyboardType()}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          maxLength={maxLength}
          editable={!disabled}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
        />
        {isPasswordType ? (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="ml-2">
            <StyledIcon
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              className={iconClasses}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <StyledIcon name={rightIcon} size={20} className={`${iconClasses} ml-2`} />
        ) : null}
      </View>
      {error && <Text className={errorTextClasses}>{error}</Text>}
    </View>
  );
};
