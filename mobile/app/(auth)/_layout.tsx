import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="welcome" options={{ title: 'Welcome', headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Log In' }} />
      <Stack.Screen name="register" options={{ title: 'Sign Up' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Forgot Password' }} />
      <Stack.Screen name="user-experiences" options={{ title: 'User Experiences', headerShown: false }} />
      <Stack.Screen name="pricing" options={{ title: 'Pricing', headerShown: false }} />
    </Stack>
  );
}
