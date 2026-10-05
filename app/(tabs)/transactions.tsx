/**
 * Paws — History Screen
 * Full history grouped by day, filterable (stats live in Insights).
 */
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TransactionItem } from '../../components/TransactionItem';
import { AddMenu, EmptyState, ScreenHeader, ui } from '../../components/ui';
import Colors from '../../constants/Colors';
import { useDb } from '../../lib/db/DbContext';
import { deleteTransaction, getActiveProfile, getTransactions } from '../../lib/db/queries';
import type { Transaction, TransactionType } from '../../lib/types';
import { themed } from '../../components/theme';

type Filter = 'all' | TransactionType;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfers' },
];

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;

export default function HistoryScreen() {
  const db = useDb();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const p = await getActiveProfile(db);
    if (!p) return;
    setTransactions(await getTransactions(db, p.id, 100, 0));

  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleDelete = useCallback((txn: Transaction) => {
    Alert.alert('Delete Transaction', `Remove "${txn.memo || txn.category_name || txn.type}" (₱${txn.amount.toLocaleString()})?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTransaction(db, txn.id); load(); } },
    ]);
  }, [db, load]);

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);
  const byDate = new Map<string, Transaction[]>();
  filtered.forEach(t => byDate.set(t.date, [...(byDate.get(t.date) ?? []), t]));

  return (
    <View style={ui.screen}>
      <ScreenHeader title="History" subtitle="Every income, expense and transfer" />
      <ScrollView
        contentContainerStyle={ui.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters */}
        <View style={styles.segment} accessibilityRole="tablist">
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.segItem, filter === f.id && styles.segActive]}
              onPress={() => setFilter(f.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === f.id }}
            >
              <Text style={[styles.segLabel, filter === f.id && styles.segLabelActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* History */}
        {byDate.size === 0 ? (
          <EmptyState icon="receipt-outline" text="No transactions found." />
        ) : (
          [...byDate].map(([date, txns]) => (
            <View key={date} style={[ui.card, { paddingVertical: 6 }]}>
              <DateHeader date={date} txns={txns} />
              {txns.map(txn => <TransactionItem key={txn.id} txn={txn} onLongPress={() => handleDelete(txn)} />)}
            </View>
          ))
        )}
      </ScrollView>

      <AddMenu />
    </View>
  );
}

function DateHeader({ date, txns }: { date: string; txns: Transaction[] }) {
  const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <View style={styles.dateHeader}>
      <Text style={styles.dateLabel}>{label.toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {income > 0 && <Text style={[styles.dateTotal, { color: Colors.income }]}>+{peso(income)}</Text>}
        {expenses > 0 && <Text style={[styles.dateTotal, { color: Colors.expense }]}>-{peso(expenses)}</Text>}
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({


  segment: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, padding: 4, marginTop: 8, borderWidth: 1, borderColor: Colors.border },
  segItem: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segActive: { backgroundColor: Colors.primary },
  segLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  segLabelActive: { color: Colors.onPrimary },

  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 2 },
  dateLabel: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.6 },
  dateTotal: { fontSize: 13, fontWeight: '800' },
}));
