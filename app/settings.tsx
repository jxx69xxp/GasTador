/**
 * Paws — Settings
 * Profile name, payday reminders, appearance, Online / Offline mode, sync, and log out.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme, type ThemePref } from '../components/theme';
import { ui } from '../components/ui';
import Colors from '../constants/Colors';
import { supabase, useAuth } from '../lib/auth';
import { useDb } from '../lib/db/DbContext';
import { cancelReminders } from '../lib/notifications';
import { backupNow, getCloudBackup, getLastBackup, localTransactionCount, restoreFromCloud } from '../lib/sync';
import { countTransactions } from '../lib/db/queries';
import { daysUntilPayday } from '../lib/paydayDates';
import { themed } from '../components/theme';

export default function SettingsScreen() {
  const { session, offline, name, setName, paydays, setPaydays, continueOffline, signOut } = useAuth();
  const [draft, setDraft] = useState(name);
  const [saved, setSaved] = useState(false);
  const { pref, setPref } = useTheme();
  const db = useDb();
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<'backup' | 'restore' | null>(null);

  useEffect(() => { getLastBackup().then(setLastBackup); }, []);

  async function runBackup() {
    setSyncing('backup');
    try {
      const cloud = await getCloudBackup();
      const local = await localTransactionCount(db);
      const cloudCount = cloud ? countTransactions(cloud.data) : 0;
      if (cloudCount > local) {
        // never silently replace a bigger backup with a smaller phone
        const ok = await new Promise<boolean>(res => Alert.alert(
          'Replace your cloud backup?',
          `The cloud has ${cloudCount} transactions; this phone has ${local}. Backing up replaces the cloud copy.`,
          [{ text: 'Cancel', style: 'cancel', onPress: () => res(false) }, { text: 'Replace', style: 'destructive', onPress: () => res(true) }],
        ));
        if (!ok) return;
      }
      setLastBackup(await backupNow(db));
    } catch (e: any) {
      Alert.alert('Backup failed', e?.message ?? String(e));
    } finally {
      setSyncing(null);
    }
  }

  function runRestore() {
    Alert.alert('Restore from cloud?', 'This replaces everything on this phone with your last backup.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore', style: 'destructive', onPress: async () => {
          setSyncing('restore');
          try {
            const n = await restoreFromCloud(db);
            setLastBackup(await getLastBackup());
            Alert.alert('Restored', `${n} transactions restored from your backup.`);
          } catch (e: any) {
            Alert.alert('Restore failed', e?.message ?? String(e));
          } finally {
            setSyncing(null);
          }
        },
      },
    ]);
  }
  const online = !!session && !offline;
  const initial = (draft || session?.user.email || 'P').trim()[0]?.toUpperCase() ?? 'P';

  // Settings sits above the tabs, so it must leave by itself after logging out / going online
  if (!session && !offline) return <Redirect href="/mode" />;

  async function saveName() {
    await setName(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function pickMode(next: 'online' | 'offline') {
    if (next === (online ? 'online' : 'offline')) return;
    if (next === 'offline') {
      Alert.alert('Use Paws offline?', 'You’ll be signed out of your account. Everything you logged stays on this phone.', [
        { text: 'Cancel', style: 'cancel' },
        // set offline first so the app never bounces to the welcome screen
        { text: 'Go offline', onPress: async () => { await continueOffline(); await supabase.auth.signOut(); } },
      ]);
    } else {
      Alert.alert('Go online?', 'Sign in or create an account on the next screen. Your data stays on this phone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => signOut() },
      ]);
    }
  }

  function logOut() {
    Alert.alert(online ? 'Log out?' : 'Exit offline mode?', 'Your entries stay saved on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: online ? 'Log out' : 'Exit', style: 'destructive', onPress: () => { cancelReminders(); signOut(); } },
    ]);
  }

  return (
    <ScrollView style={ui.screen} contentContainerStyle={[ui.scroll, { paddingTop: 4 }]}>
      {/* Profile */}
      <Text style={ui.section}>PROFILE</Text>
      <View style={[ui.card, styles.profile]}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="What should Paws call you?"
            placeholderTextColor={Colors.textMuted}
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={saveName}
            accessibilityLabel="Your name"
          />
          <Text style={styles.hint} numberOfLines={1}>
            {online ? session?.user.email : 'Offline — no account'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.saveBtn, draft.trim() === name && styles.saveDisabled]}
        onPress={saveName}
        disabled={draft.trim() === name}
        accessibilityRole="button"
      >
        <Text style={styles.saveText}>{saved ? 'Saved ✓' : 'Save name'}</Text>
      </TouchableOpacity>

      {/* Payday */}
      <Text style={ui.section}>PAYDAY REMINDERS</Text>
      <View style={[ui.card, { marginTop: 10 }]}>
        <Text style={styles.cardTitle}>When do you get paid?</Text>
        <Text style={styles.cardSub}>Tap your salary days. Paws reminds you at 9:00 AM to log it.</Text>
        <View style={styles.dayGrid}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
            const on = paydays.includes(d);
            return (
              <TouchableOpacity
                key={d}
                style={[styles.day, on && styles.dayOn]}
                hitSlop={3} // 42pt cell + slop = 48pt target, 7 per row still fits
                onPress={() => setPaydays(on ? paydays.filter(x => x !== d) : [...paydays, d])}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Day ${d}`}
              >
                <Text style={[styles.dayText, on && styles.dayTextOn]}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.hint}>{paydayText(paydays)}</Text>
      </View>

      {/* Appearance */}
      <Text style={ui.section}>APPEARANCE</Text>
      <View style={styles.themeRow} accessibilityRole="radiogroup">
        {([['system', 'phone-portrait-outline', 'System'], ['light', 'sunny-outline', 'Light'], ['dark', 'moon-outline', 'Dark']] as const)
          .map(([id, icon, label]) => {
            const on = pref === id;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.themeItem, on && styles.modeOn]}
                onPress={() => setPref(id as ThemePref)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
              >
                <Ionicons name={icon} size={22} color={on ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.themeLabel, on && { color: Colors.primary }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
      </View>

      {/* Sync */}
      <Text style={ui.section}>CLOUD BACKUP</Text>
      <View style={[ui.card, { marginTop: 10 }]}>
        {online ? (
          <>
            <Text style={styles.cardTitle}>Backed up to your account</Text>
            <Text style={styles.cardSub}>
              {lastBackup
                ? `Last backup: ${new Date(lastBackup).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                : 'Not backed up yet.'}{' '}Paws also backs up automatically when you leave the app.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.syncBtn, styles.syncPrimary]} onPress={runBackup} disabled={!!syncing} accessibilityRole="button">
                {syncing === 'backup' ? <ActivityIndicator color={Colors.onPrimary} /> : (
                  <><Ionicons name="cloud-upload-outline" size={18} color={Colors.onPrimary} /><Text style={styles.syncPrimaryText}>Back up now</Text></>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.syncBtn} onPress={runRestore} disabled={!!syncing} accessibilityRole="button">
                {syncing === 'restore' ? <ActivityIndicator color={Colors.primary} /> : (
                  <><Ionicons name="cloud-download-outline" size={18} color={Colors.primary} /><Text style={styles.syncText}>Restore</Text></>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>Not backed up</Text>
            <Text style={[styles.cardSub, { marginBottom: 0 }]}>You’re offline, so your data lives only on this phone. Switch to Online below to back it up to your account.</Text>
          </>
        )}
      </View>

      {/* Mode */}
      <Text style={ui.section}>MODE</Text>
      <View style={styles.segment} accessibilityRole="radiogroup">
        <ModeOption icon="cloud-outline" title="Online" desc="Sign in with your account" on={online} onPress={() => pickMode('online')} />
        <ModeOption icon="phone-portrait-outline" title="Offline" desc="No account, stays on this phone" on={!online} onPress={() => pickMode('offline')} />
      </View>
      <Text style={styles.note}>
        Offline keeps everything on this phone. Online signs in and backs your data up to your account.
      </Text>

      {/* Log out */}
      <TouchableOpacity style={styles.logout} onPress={logOut} accessibilityRole="button">
        <Ionicons name="log-out-outline" size={20} color={Colors.expense} />
        <Text style={styles.logoutText}>{online ? 'Log out' : 'Exit offline mode'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function paydayText(days: number[]) {
  const next = daysUntilPayday(days, new Date());
  if (!next) return 'No paydays set. Common in the Philippines: 15 and 30.';
  const when = next.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const label = next.days === 0 ? 'today' : next.days === 1 ? 'tomorrow' : `in ${next.days} days`;
  return `Paydays: ${days.join(', ')}. Next is ${when} (${label}). Days past a month’s end fall on its last day.`;
}

function ModeOption({ icon, title, desc, on, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; desc: string; on: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.mode, on && styles.modeOn]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
    >
      <Ionicons name={icon} size={22} color={on ? Colors.primary : Colors.textSecondary} />
      <Text style={[styles.modeTitle, on && { color: Colors.primary }]}>{title}</Text>
      <Text style={styles.modeDesc}>{desc}</Text>
      {on && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} style={styles.check} />}
    </TouchableOpacity>
  );
}

const styles = themed(() => StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  input: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  hint: { fontSize: 13, color: Colors.textSecondary, marginTop: 6 },
  saveBtn: { marginTop: 12, minHeight: 48, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveDisabled: { opacity: 0.45 },
  saveText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '700' },

  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, marginBottom: 12, lineHeight: 18 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.screenBg },
  dayOn: { backgroundColor: Colors.primary },
  dayText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  dayTextOn: { color: Colors.onPrimary },

  syncBtn: {
    flex: 1, flexDirection: 'row', gap: 6, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  syncPrimary: { backgroundColor: Colors.primary },
  syncPrimaryText: { color: Colors.onPrimary, fontSize: 15, fontWeight: '800' },
  syncText: { color: Colors.primary, fontSize: 15, fontWeight: '800' },
  themeRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  themeItem: {
    flex: 1, minHeight: 72, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  themeLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  segment: { flexDirection: 'row', gap: 10, marginTop: 10 },
  mode: { flex: 1, padding: 14, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, gap: 4, minHeight: 110 },
  modeOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  modeTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  modeDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  check: { position: 'absolute', top: 12, right: 12 },
  note: { fontSize: 13, color: Colors.textSecondary, marginTop: 10, lineHeight: 19 },

  logout: {
    flexDirection: 'row', gap: 8, marginTop: 28, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.expense + '55',
  },
  logoutText: { color: Colors.expense, fontSize: 16, fontWeight: '800' },
}));
