import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '../../stores/uiStore';

export const ToastContainer: React.FC = () => {
  const toasts = useUIStore((state) => state.toasts);

  return (
    <View style={styles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </View>
  );
};

interface ToastItemProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const ToastItem: React.FC<ToastItemProps> = ({ id, type, message }) => {
  const opacity = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2600),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getTypeConfig = () => {
    const configs = {
      success: { bg: '#10B981', icon: 'checkmark-circle' as const },
      error: { bg: '#EF4444', icon: 'alert-circle' as const },
      warning: { bg: '#F59E0B', icon: 'warning' as const },
      info: { bg: '#3B82F6', icon: 'information-circle' as const },
    };
    return configs[type];
  };

  const config = getTypeConfig();

  return (
    <Animated.View style={[styles.toast, { backgroundColor: config.bg, opacity }]}>
      <Ionicons name={config.icon} size={20} color="#FFFFFF" />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
});
