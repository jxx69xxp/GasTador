/**
 * GasTador — Transactions Screen
 * Shows full transaction log with filter by type and delete on long-press
 */

import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
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
import { TransactionItem } from '../../components/TransactionItem';
import Colors from '../../constants/Colors';
import { deleteTransaction, getActiveProfile, getTransactions } from '../../lib/db/queries';
import type { Profile, Transaction, TransactionType } from '../../lib/types';

type Filter = 'all' | TransactionType;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: '🔴 Expense' },
  { id: 'income', label: '🟢 Income' },
  { id: 'transfer', label: '🔵 Transfer' },
];

export default function TransactionsScreen() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const p = await getActiveProfile(db);
    if (!p) return;
    setProfile(p);
    const txns = await getTransactions(db, p.id, 100, 0);
    setTransactions(txns);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleDelete = useCallback((txn: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Remove "${txn.memo || txn.category_name || txn.type}" (₱${txn.amount.toLocaleString()})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => { await deleteTransaction(db, txn.id); load(); },
        },
      ]
    );
  }, [db, load]);

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);

  // Group by date
  const byDate: Record<string, Transaction[]> = {};
  for (const txn of filtered) {
    if (!byDate[txn.date]) byDate[txn.date] = [];
    byDate[txn.date].push(txn);
  }

  return (
    <View style={styles.screen}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, filter === f.id && styles.filterActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterLabel, filter === f.id && styles.filterLabelActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {Object.keys(byDate).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No transactions found.</Text>
          </View>
        ) : (
          Object.entries(byDate).map(([date, txns]) => (
            <View key={date}>
              <DateHeader date={date} txns={txns} />
              {txns.map(txn => (
                <TransactionItem key={txn.id} txn={txn} onLongPress={() => handleDelete(txn)} />
              ))}
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/modal/add-transaction')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function DateHeader({ date, txns }: { date: string; txns: Transaction[] }) {
  const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const d = new Date(date + 'T00:00:00');
  const label = d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <View style={styles.dateHeader}>
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateTotals}>
        {income > 0 && <Text style={styles.dateIncome}>+₱{income.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</Text>}
        {expenses > 0 && <Text style={styles.dateExpense}>-₱{expenses.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.screenBg },
  filterBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: Colors.white,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.screenBg,
  },
  filterActive: { backgroundColor: Colors.primary },
  filterLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  filterLabelActive: { color: Colors.white },
  scroll: { padding: 16, flexGrow: 1 },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  dateLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  dateTotals: { flexDirection: 'row', gap: 8 },
  dateIncome: { fontSize: 12, fontWeight: '700', color: Colors.income },
  dateExpense: { fontSize: 12, fontWeight: '700', color: Colors.expense },
  empty: { alignItems: 'center', paddingVertical: 60, flex: 1 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
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
