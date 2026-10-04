/**
 * Paws — Accounts Screen
 * Net worth, a tip from Paws, and account tiles grouped by type.
 */
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccountCard } from '../../components/AccountCard';
import { AmountText } from '../../components/AmountText';
import { CatTip, EmptyState, PillButton, ScreenHeader, ui } from '../../components/ui';
import Colors from '../../constants/Colors';
import { useDb } from '../../lib/db/DbContext';
import { deleteAccount, getAccounts, getActiveProfile, getNetWorth } from '../../lib/db/queries';
import type { Account, NetWorth } from '../../lib/types';

const TYPE_LABEL: Record<string, string> = {
  cash: 'Cash', bank: 'Bank accounts', credit_card: 'Credit cards', loan: 'Loans', investment: 'Investments',
};

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;

function accountsTip(accounts: Account[], nw: NetWorth) {
  if (accounts.length === 0) return 'Add your wallets and bank accounts so I can keep track of every peso.';
  if (nw.liabilities > 0) return `You owe ${peso(nw.liabilities)} on credit and loans. Paying it down is a purr-fect move.`;
  const top = [...accounts].sort((a, b) => b.balance - a.balance)[0];
  return top.balance > 0
    ? `Most of your money is in ${top.name} (${peso(top.balance)}). Keep it growing!`
    : 'Your balances are empty for now. Log some income to get started.';
}

export default function AccountsScreen() {
  const db = useDb();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorth>({ assets: 0, liabilities: 0, net: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const p = await getActiveProfile(db);
    if (!p) return;
    const [accs, nw] = await Promise.all([getAccounts(db, p.id), getNetWorth(db, p.id)]);
    setAccounts(accs);
    setNetWorth(nw);
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const confirmDelete = useCallback((account: Account) => {
    Alert.alert('Delete Account', `Delete "${account.name}"? All its transactions will also be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteAccount(db, account.id); load(); } },
    ]);
  }, [db, load]);

  const groups = new Map<string, Account[]>();
  accounts.forEach(a => groups.set(a.type, [...(groups.get(a.type) ?? []), a]));

  return (
    <View style={ui.screen}>
      <ScreenHeader
        title="Accounts"
        subtitle="Your wallets and balances"
        right={<PillButton icon="add" label="Add" solid onPress={() => router.push('/modal/add-account')} />}
      />
      <ScrollView
        contentContainerStyle={ui.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Net worth */}
        <View style={ui.card}>
          <Text style={ui.label}>NET WORTH</Text>
          <AmountText amount={netWorth.net} colorCoded={netWorth.net < 0} style={styles.net} />
          <View style={styles.split}>
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Assets</Text>
              <AmountText amount={netWorth.assets} style={[styles.splitValue, { color: Colors.income }]} />
            </View>
            <View style={[styles.splitItem, styles.divider]}>
              <Text style={styles.splitLabel}>Liabilities</Text>
              <AmountText amount={netWorth.liabilities} style={[styles.splitValue, { color: Colors.expense }]} />
            </View>
          </View>
        </View>

        <CatTip text={accountsTip(accounts, netWorth)} />

        {accounts.length === 0 && <EmptyState icon="wallet-outline" text={'No accounts yet.\nTap “Add” to create your first one.'} />}

        {[...groups].map(([type, accs]) => (
          <View key={type}>
            <View style={styles.groupHeader}>
              <Text style={ui.section}>{(TYPE_LABEL[type] ?? type).toUpperCase()}</Text>
              <Text style={styles.groupTotal}>{peso(accs.reduce((s, a) => s + a.balance, 0))}</Text>
            </View>
            <View style={styles.grid}>
              {accs.map(acc => (
                <AccountCard
                  key={acc.id}
                  account={acc}
                  onPress={() => Alert.alert(acc.name, `Balance: ₱${acc.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, [
                    { text: 'OK' },
                    { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(acc) },
                  ])}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  net: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  split: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  splitItem: { flex: 1 },
  divider: { borderLeftWidth: 1, borderLeftColor: Colors.border, paddingLeft: 14 },
  splitLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  splitValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  groupTotal: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
});
