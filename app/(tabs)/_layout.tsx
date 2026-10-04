import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import Colors from '../../constants/Colors';
import { useAuth } from '../../lib/auth';
import { cancelReminders, setupDailyReminder } from '../../lib/notifications';

type IconName = keyof typeof Ionicons.glyphMap;

// Filled when active, outline when inactive; tint comes from tabBarActive/InactiveTintColor
const tabIcon = (name: string) => ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
  <Ionicons name={(focused ? name : `${name}-outline`) as IconName} size={size} color={color} />
);

export default function TabLayout() {
  const { session, signOut } = useAuth();

  useEffect(() => {
    if (session) setupDailyReminder().catch(() => {});
  }, [session]);

  if (session === undefined) return null;
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => { cancelReminders(); signOut(); }}
            style={{ marginRight: 8, padding: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={24} color={Colors.white} />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: tabIcon('home'),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarLabel: 'Accounts',
          tabBarIcon: tabIcon('wallet'),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarLabel: 'Log',
          tabBarIcon: tabIcon('list'),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          tabBarLabel: 'Budgets',
          tabBarIcon: tabIcon('pie-chart'),
        }}
      />
    </Tabs>
  );
}
