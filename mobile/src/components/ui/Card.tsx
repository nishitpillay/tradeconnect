import React from 'react';
import { View, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

const cardClasses = 'bg-white rounded-xl p-4 shadow-sm';

export const Card: React.FC<CardProps> = ({ children, onPress, className = '', style }) => {
  const combinedClasses = `${cardClasses} ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity
        className={combinedClasses}
        style={style}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View className={combinedClasses} style={style}>{children}</View>;
};
