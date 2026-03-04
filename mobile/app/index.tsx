import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return null; // Or a loading screen
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/(customer)" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
