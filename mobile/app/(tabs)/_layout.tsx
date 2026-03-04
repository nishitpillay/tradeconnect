import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore } from '../../src/stores/sessionStore';

export default function TabsLayout() {
  const { role } = useSessionStore();

  if (role === 'customer') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#9CA3AF',
          headerShown: true,
        }}
      >
        <Tabs.Screen
          name="(customer)/index"
          options={{
            title: 'My Jobs',
            tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages/index"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="notifications/index"
          options={{
            title: 'Notifications',
            tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          }}
        />
        {/* Hide provider tabs */}
        <Tabs.Screen name="(provider)/index" options={{ href: null }} />
      </Tabs>
    );
  }

  if (role === 'provider') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#10B981',
          tabBarInactiveTintColor: '#9CA3AF',
          headerShown: true,
        }}
      >
        <Tabs.Screen
          name="(provider)/index"
          options={{
            title: 'Find Jobs',
            tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages/index"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          }}
        />
        {/* Hide customer tabs */}
        <Tabs.Screen name="(customer)/index" options={{ href: null }} />
        <Tabs.Screen name="notifications/index" options={{ href: null }} />
      </Tabs>
    );
  }

  return null;
}
