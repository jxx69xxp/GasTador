/**
 * MeowMeow — Dashboard Screen
 * Shows: Net worth card, today/month summary, quick-add FAB, recent transactions
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
import { AmountText } from '../../components/AmountText';
import { TransactionItem } from '../../components/TransactionItem';
import Colors from '../../constants/Colors';
import {
  deleteTransaction,
  getActiveProfile,
  getDailySummary,
  getMonthlySummary,
  getNetWorth,
  getTransactions,
} from '../../lib/db/queries';
import type { DailySummary, NetWorth, Profile, Transaction } from '../../lib/types';

const TODAY = new Date().toISOString().slice(0, 10);
const NOW = new Date();

export default function DashboardScreen() {
  const db = useDb();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [netWorth, setNetWorth] = useState<NetWorth>({ assets: 0, liabilities: 0, net: 0 });
  const [todaySummary, setTodaySummary] = useState<DailySummary>({ income: 0, expenses: 0, net: 0 });
  const [monthSummary, setMonthSummary] = useState<DailySummary>({ income: 0, expenses: 0, net: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const p = await getActiveProfile(db);
    if (!p) return;
    setProfile(p);
    const [nw, today, month, txns] = await Promise.all([
      getNetWorth(db, p.id),
      getDailySummary(db, p.id, TODAY),
      getMonthlySummary(db, p.id, NOW.getFullYear(), NOW.getMonth() + 1),
      getTransactions(db, p.id, 10, 0),
    ]);
    setNetWorth(nw);
    setTodaySummary(today);
    setMonthSummary(month);
    setTransactions(txns);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleDeleteTxn = useCallback((txn: Transaction) => {
    Alert.alert('Delete Transaction', `Remove "${txn.memo || txn.category_name || txn.type}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteTransaction(db, txn.id);
          load();
        },
      },
    ]);
  }, [db, load]);

  const monthName = NOW.toLocaleString('default', { month: 'long' });

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header / Net Worth Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Net Worth</Text>
          <AmountText amount={netWorth.net} style={styles.heroAmount} />
          <View style={styles.heroRow}>
            <View style={styles.heroItem}>
              <Text style={styles.heroSub}>Assets</Text>
              <AmountText amount={netWorth.assets} style={styles.heroItemAmt} />
            </View>
            <View style={[styles.heroItem, styles.heroDivider]}>
              <Text style={styles.heroSub}>Liabilities</Text>
              <AmountText amount={netWorth.liabilities} style={[styles.heroItemAmt, { color: Colors.expense }]} />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* ── Today Summary ── */}
          <Text style={styles.sectionTitle}>Today</Text>
          <View style={styles.summaryRow}>
            <SummaryCard label="Income" amount={todaySummary.income} color={Colors.income} />
            <SummaryCard label="Expenses" amount={todaySummary.expenses} color={Colors.expense} />
            <SummaryCard label="Net" amount={todaySummary.net} color={todaySummary.net >= 0 ? Colors.income : Colors.expense} />
          </View>

          {/* ── Month Summary ── */}
          <Text style={styles.sectionTitle}>{monthName}</Text>
          <View style={styles.summaryRow}>
            <SummaryCard label="Income" amount={monthSummary.income} color={Colors.income} />
            <SummaryCard label="Expenses" amount={monthSummary.expenses} color={Colors.expense} />
            <SummaryCard label="Net" amount={monthSummary.net} color={monthSummary.net >= 0 ? Colors.income : Colors.expense} />
          </View>

          {/* ── Recent Transactions ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>No transactions yet.{'\n'}Tap + to log your first entry.</Text>
            </View>
          ) : (
            transactions.map(txn => (
              <TransactionItem key={txn.id} txn={txn} onLongPress={() => handleDeleteTxn(txn)} />
            ))
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/modal/add-transaction')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function SummaryCard({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <AmountText amount={amount} style={[styles.summaryAmount, { color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.screenBg },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heroLabel: { color: Colors.white + 'CC', fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  heroAmount: { color: Colors.white, fontSize: 38, fontWeight: '800', marginTop: 4 },
  heroRow: { flexDirection: 'row', marginTop: 20, width: '100%' },
  heroItem: { flex: 1, alignItems: 'center' },
  heroDivider: { borderLeftWidth: 1, borderLeftColor: Colors.white + '33' },
  heroSub: { color: Colors.white + 'AA', fontSize: 11, marginBottom: 4 },
  heroItemAmt: { color: Colors.white, fontSize: 16, fontWeight: '700' },

  content: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 20, marginBottom: 10 },
  seeAll: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4, fontWeight: '600' },
  summaryAmount: { fontSize: 14, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 40 },
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
