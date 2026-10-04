/**
 * MeowMeow — Accounts Screen
 */

import { router } from 'expo-router';
import { useDb } from '../../lib/db/DbContext';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AccountCard } from '../../components/AccountCard';
import { AmountText } from '../../components/AmountText';
import Colors from '../../constants/Colors';
import { deleteAccount, getAccounts, getActiveProfile, getNetWorth } from '../../lib/db/queries';
import type { Account, NetWorth, Profile } from '../../lib/types';

export default function AccountsScreen() {
  const db = useDb();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorth>({ assets: 0, liabilities: 0, net: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const p = await getActiveProfile(db);
    if (!p) return;
    setProfile(p);
    const [accs, nw] = await Promise.all([
      getAccounts(db, p.id),
      getNetWorth(db, p.id),
    ]);
    setAccounts(accs);
    setNetWorth(nw);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleDeleteAccount = useCallback((account: Account) => {
    Alert.alert(
      'Delete Account',
      `Delete "${account.name}"? All its transactions will also be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteAccount(db, account.id);
            load();
          },
        },
      ]
    );
  }, [db, load]);

  // Group accounts by type
  const groups: Record<string, Account[]> = {};
  for (const acc of accounts) {
    if (!groups[acc.type]) groups[acc.type] = [];
    groups[acc.type].push(acc);
  }

  const typeLabel: Record<string, string> = {
    cash: '💵 Cash',
    bank: '🏦 Bank',
    credit_card: '💳 Credit Cards',
    loan: '🏦 Loans',
    investment: '📈 Investments',
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Net Worth Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerItem}>
            <Text style={styles.bannerLabel}>Net Worth</Text>
            <AmountText amount={netWorth.net} colorCoded style={styles.bannerMain} />
          </View>
          <View style={styles.bannerSide}>
            <Text style={styles.bannerLabel}>Assets</Text>
            <AmountText amount={netWorth.assets} style={[styles.bannerSub, { color: Colors.income }]} />
          </View>
          <View style={styles.bannerSide}>
            <Text style={styles.bannerLabel}>Liabilities</Text>
            <AmountText amount={netWorth.liabilities} style={[styles.bannerSub, { color: Colors.expense }]} />
          </View>
        </View>

        <View style={styles.content}>
          {Object.entries(groups).map(([type, accs]) => (
            <View key={type}>
              <Text style={styles.groupTitle}>{typeLabel[type] ?? type}</Text>
              {accs.map(acc => (
                <AccountCard
                  key={acc.id}
                  account={acc}
                  onPress={() =>
                    Alert.alert(acc.name, `Balance: ₱${acc.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, [
                      { text: 'OK' },
                      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteAccount(acc) },
                    ])
                  }
                />
              ))}
            </View>
          ))}

          {accounts.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyText}>No accounts yet.{'\n'}Tap + to add your first account.</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/modal/add-account')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add account"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.screenBg },
  scroll: { flexGrow: 1 },
  banner: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    gap: 12,
  },
  bannerItem: { flex: 2 },
  bannerSide: { flex: 1, alignItems: 'flex-end' },
  bannerLabel: { color: Colors.white + 'AA', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  bannerMain: { color: Colors.white, fontSize: 26, fontWeight: '800' },
  bannerSub: { fontSize: 14, fontWeight: '700' },
  content: { padding: 16 },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: { fontSize: 28, color: Colors.white, lineHeight: 30 },
});
