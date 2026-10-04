import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import Colors from '../../constants/Colors';
import { useAuth } from '../../lib/auth';
import { schedulePaydays, setupDailyReminder } from '../../lib/notifications';

type IconName = keyof typeof Ionicons.glyphMap;

// Filled when active, outline when inactive; tint comes from tabBarActive/InactiveTintColor
const tabIcon = (name: string) => ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
  <Ionicons name={(focused ? name : `${name}-outline`) as IconName} size={size} color={color} />
);

export default function TabLayout() {
  const { session, offline, ready, paydays } = useAuth();
  const allowed = !!session || !!offline;

  useEffect(() => {
    if (allowed) setupDailyReminder().catch(() => {});
  }, [allowed]);

  // re-roll the 12-month payday window on every open and whenever the days change
  useEffect(() => {
    if (allowed) schedulePaydays(paydays).catch(() => {});
  }, [allowed, paydays]);

  if (!ready) return null;
  if (!allowed) return <Redirect href="/mode" />;

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
        headerShown: false, // every tab draws its own ScreenHeader (components/ui.tsx)
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
          title: 'History',
          tabBarLabel: 'History',
          tabBarIcon: tabIcon('time'),
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
