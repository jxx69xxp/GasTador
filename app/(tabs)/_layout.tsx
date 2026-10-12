import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import Colors from '../../constants/Colors';
import { useAuth } from '../../lib/auth';
import { useDb } from '../../lib/db/DbContext';
import { scheduleReminders, schedulePaydays, setupDailyReminder } from '../../lib/notifications';
import { backupNow, getCloudBackup, localTransactionCount, restoreFromCloud } from '../../lib/sync';
import { countTransactions } from '../../lib/db/queries';

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

  useEffect(() => {
    if (allowed) scheduleReminders().catch(() => {});
  }, [allowed]);

  const db = useDb();
  const online = !!session && !offline;

  // Online: back up whenever the app goes to the background (skips empty installs, see backupNow)
  useEffect(() => {
    if (!online) return;
    const sub = AppState.addEventListener('change', s => { if (s === 'background') backupNow(db, { auto: true }).catch(() => {}); });
    return () => sub.remove();
  }, [online, db]);

  // New phone: offer to restore when this phone is empty but the account has a backup
  useEffect(() => {
    if (!online) return;
    (async () => {
      const [cloud, local] = await Promise.all([getCloudBackup(), localTransactionCount(db)]);
      if (!cloud || local > 0 || countTransactions(cloud.data) === 0) return;
      const when = new Date(cloud.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      Alert.alert('Restore your backup?', `Found ${countTransactions(cloud.data)} transactions backed up on ${when}.`, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Restore', onPress: () => restoreFromCloud(db).catch(e => Alert.alert('Restore failed', String(e.message ?? e))) },
      ]);
    })().catch(() => {});
  }, [online, db]);

  if (!ready) return null;
  if (!allowed) return <Redirect href="/mode" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          // web's default 49px bar squeezes the label and clips descenders; native sizes itself around the safe area
          ...(Platform.OS === 'web' && { height: 60, paddingTop: 4 }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          fontWeight: '600',
        },
        headerShown: false, // every tab draws its own ScreenHeader (components/ui.tsx)
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarLabel: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="accounts" options={{ title: 'Wallet', tabBarLabel: 'Wallet', tabBarIcon: tabIcon('wallet') }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarLabel: 'Plan', tabBarIcon: tabIcon('clipboard') }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarLabel: 'Insights', tabBarIcon: tabIcon('stats-chart') }} />
      <Tabs.Screen name="transactions" options={{ title: 'History', tabBarLabel: 'History', tabBarIcon: tabIcon('time') }} />
    </Tabs>
  );
}
