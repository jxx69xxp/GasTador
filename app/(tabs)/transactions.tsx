/**
 * Paws — History Screen
 * This month's totals, where the money went (by category), then the full history grouped by day.
 */
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AmountText } from '../../components/AmountText';
import { TransactionItem } from '../../components/TransactionItem';
import { EmptyState, Fab, ScreenHeader, ui } from '../../components/ui';
import Colors from '../../constants/Colors';
import { useDb } from '../../lib/db/DbContext';
import { deleteTransaction, getActiveProfile, getTransactions, getTransactionsByDateRange } from '../../lib/db/queries';
import type { Transaction, TransactionType } from '../../lib/types';
import { themed } from '../../components/theme';

type Filter = 'all' | TransactionType;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfers' },
];

type Slice = { name: string; icon: string; color: string; total: number };

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;

export default function HistoryScreen() {
  const db = useDb();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState({ income: 0, expenses: 0 });
  const [slices, setSlices] = useState<Slice[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const p = await getActiveProfile(db);
    if (!p) return;
    const today = new Date().toISOString().slice(0, 10);
    const [txns, monthTxns] = await Promise.all([
      getTransactions(db, p.id, 100, 0),
      getTransactionsByDateRange(db, p.id, `${today.slice(0, 7)}-01`, today),
    ]);
    setTransactions(txns);

    const byCat = new Map<string, Slice>();
    let income = 0, expenses = 0;
    for (const t of monthTxns) {
      if (t.type === 'income') income += t.amount;
      if (t.type !== 'expense') continue;
      expenses += t.amount;
      const key = t.category_name ?? 'Uncategorized';
      const s = byCat.get(key) ?? { name: key, icon: t.category_icon ?? '📦', color: t.category_color ?? Colors.textMuted, total: 0 };
      s.total += t.amount;
      byCat.set(key, s);
    }
    setMonth({ income, expenses });
    setSlices([...byCat.values()].sort((a, b) => b.total - a.total));
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
  const monthName = new Date().toLocaleString('en-US', { month: 'long' });

  return (
    <View style={ui.screen}>
      <ScreenHeader title="History" subtitle="Where your money goes" />
      <ScrollView
        contentContainerStyle={ui.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* This month */}
        <View style={styles.statsRow}>
          <Stat label="INCOME" amount={month.income} color={Colors.income} />
          <Stat label="SPENT" amount={month.expenses} color={Colors.expense} />
          <Stat label="NET" amount={month.income - month.expenses} color={month.income >= month.expenses ? Colors.income : Colors.expense} />
        </View>

        {/* Expense distribution */}
        <View style={ui.card}>
          <Text style={styles.cardTitle}>Spending in {monthName}</Text>
          <Text style={styles.cardSub}>By category</Text>
          {slices.length === 0 ? (
            <Text style={styles.muted}>No expenses yet this month.</Text>
          ) : (
            <>
              <View style={styles.stack} accessibilityLabel={`Top category: ${slices[0].name}, ${Math.round((slices[0].total / month.expenses) * 100)} percent`}>
                {slices.map(s => (
                  <View key={s.name} style={{ flex: s.total, backgroundColor: s.color }} />
                ))}
              </View>
              {slices.slice(0, 5).map(s => (
                <View key={s.name} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: s.color }]} />
                  <Text style={styles.legendName} numberOfLines={1}>{s.icon} {s.name}</Text>
                  <Text style={styles.legendPct}>{Math.round((s.total / month.expenses) * 100)}%</Text>
                  <Text style={styles.legendAmt}>{peso(s.total)}</Text>
                </View>
              ))}
            </>
          )}
        </View>

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

      <Fab label="Expense" onPress={() => router.push('/modal/add-transaction')} />
    </View>
  );
}

function Stat({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <View style={[ui.card, styles.stat]}>
      <Text style={ui.label}>{label}</Text>
      <AmountText amount={amount} style={[styles.statValue, { color }]} />
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
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 12 },
  statValue: { fontSize: 15, fontWeight: '800', marginTop: 4 },

  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  muted: { fontSize: 14, color: Colors.textSecondary },
  stack: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2, marginBottom: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  legendPct: { fontSize: 13, color: Colors.textSecondary, fontWeight: '700', width: 40, textAlign: 'right' },
  legendAmt: { fontSize: 14, color: Colors.textPrimary, fontWeight: '800', minWidth: 70, textAlign: 'right' },

  segment: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, padding: 4, marginTop: 18, borderWidth: 1, borderColor: Colors.border },
  segItem: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segActive: { backgroundColor: Colors.primary },
  segLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  segLabelActive: { color: Colors.onPrimary },

  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 2 },
  dateLabel: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.6 },
  dateTotal: { fontSize: 13, fontWeight: '800' },
}));
