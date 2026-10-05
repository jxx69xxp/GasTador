/**
 * Paws — Dashboard Screen
 * Greeting, Paws the cat's spending tip, last-7-days chart, spent today, month balance, recent activity.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountText } from '../../components/AmountText';
import { TransactionItem } from '../../components/TransactionItem';
import { AddMenu, CatTip, EmptyState, shadow } from '../../components/ui';
import Colors from '../../constants/Colors';
import { useAuth } from '../../lib/auth';
import { useDb } from '../../lib/db/DbContext';
import {
  deleteTransaction, getActiveProfile, getMonthlySummary, getTransactions, getTransactionsByDateRange,
} from '../../lib/db/queries';
import { daysUntilPayday, localISO } from '../../lib/paydayDates';
import { monthEndProjection } from '../../lib/projection';
import type { DailySummary, Transaction } from '../../lib/types';
import { themed } from '../../components/theme';

const iso = localISO;

function greeting(now: Date) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

// "pauljun69@gmail.com" -> "Pauljun"
function firstName(email?: string) {
  const s = (email ?? '').split('@')[0].replace(/[^a-zA-Z]/g, '');
  return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : 'there';
}

function catTip(monthSpent: number, todaySpent: number, topCategory: string | null, hasAny: boolean) {
  if (!hasAny) return "Hi, I'm Paws! Log your first expense and I'll keep an eye on your pesos.";
  if (monthSpent === 0) return 'No spending yet this month. Purr-fect start!';
  const fmt = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;
  const where = topCategory ? `, mostly on ${topCategory}` : '';
  const today = todaySpent === 0 ? ' Nothing spent today, nice!' : ` ${fmt(todaySpent)} so far today.`;
  return `You've spent ${fmt(monthSpent)} this month${where}.${today}`;
}

export default function DashboardScreen() {
  const db = useDb();
  const { session, name, paydays } = useAuth();
  const insets = useSafeAreaInsets();
  const [week, setWeek] = useState<{ label: string; total: number; isToday: boolean }[]>([]);
  const [todaySpent, setTodaySpent] = useState(0);
  const [month, setMonth] = useState<DailySummary>({ income: 0, expenses: 0, net: 0 });
  const [topCategory, setTopCategory] = useState<string | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const p = await getActiveProfile(db);
    if (!p) return;
    const now = new Date();
    const days = [...Array(7)].map((_, i) => new Date(now.getTime() - (6 - i) * 864e5));
    const monthStart = `${iso(now).slice(0, 7)}-01`;
    const rangeStart = iso(days[0]) < monthStart ? iso(days[0]) : monthStart;

    const [range, monthSummary, latest] = await Promise.all([
      getTransactionsByDateRange(db, p.id, rangeStart, iso(now)),
      getMonthlySummary(db, p.id, now.getFullYear(), now.getMonth() + 1),
      getTransactions(db, p.id, 5, 0),
    ]);
    const expenses = range.filter(t => t.type === 'expense');

    const byDay = new Map<string, number>();
    expenses.forEach(t => byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amount));
    setWeek(days.map((d, i) => ({
      label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      total: byDay.get(iso(d)) ?? 0,
      isToday: i === 6,
    })));
    setTodaySpent(byDay.get(iso(now)) ?? 0);

    const byCat = new Map<string, number>();
    expenses.filter(t => t.date >= monthStart && t.category_name)
      .forEach(t => byCat.set(t.category_name!, (byCat.get(t.category_name!) ?? 0) + t.amount));
    setTopCategory([...byCat].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);

    setMonth(monthSummary);
    setRecent(latest);
  }, [db]);

  // Reload whenever the tab regains focus (e.g. after adding a transaction)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleDeleteTxn = useCallback((txn: Transaction) => {
    Alert.alert('Delete Transaction', `Remove "${txn.memo || txn.category_name || txn.type}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTransaction(db, txn.id); load(); } },
    ]);
  }, [db, load]);

  const now = new Date();
  const payday = daysUntilPayday(paydays, now);
  const maxDay = Math.max(1, ...week.map(d => d.total));
  const weekTotal = week.reduce((s, d) => s + d.total, 0);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top actions ── */}

        {/* ── Greeting + settings ── */}
        <View style={styles.greetRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
            </Text>
            <Text style={styles.greeting} accessibilityRole="header">
              {greeting(now)}, <Text style={styles.name}>{name || firstName(session?.user.email)}</Text>!
            </Text>
          </View>
          <IconPill icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
        </View>

        {/* ── Paws the cat ── */}
        <CatTip text={catTip(month.expenses, todaySpent, topCategory, recent.length > 0)} />

        {/* ── Last 7 days + Spent today ── */}
        <View style={styles.row}>
          <View
            style={[styles.card, { flex: 1.25 }]}
            accessible
            accessibilityLabel={`Last 7 days: ₱${Math.round(weekTotal).toLocaleString('en-PH')} spent`}
          >
            <Text style={styles.cardLabel}>LAST 7 DAYS</Text>
            <View style={styles.chart}>
              {week.map((d, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View style={[
                      styles.bar,
                      { height: `${Math.max(6, (d.total / maxDay) * 100)}%`, backgroundColor: d.isToday ? Colors.primary : Colors.primaryLight + '66' },
                    ]} />
                  </View>
                  <Text style={[styles.barLabel, d.isToday && { color: Colors.primary, fontWeight: '800' }]}>{d.label}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={[styles.card, { flex: 1, justifyContent: 'space-between' }]}>
            <Text style={styles.cardLabel}>SPENT TODAY</Text>
            <AmountText amount={todaySpent} style={styles.bigAmount} />
          </View>
        </View>

        {/* ── Payday ── */}
        <TouchableOpacity style={styles.paydayCard} onPress={() => router.push('/settings')} accessibilityRole="button">
          <View style={styles.monthIcon}>
            <Ionicons name="cash-outline" size={20} color={Colors.income} />
          </View>
          {payday ? (
            <>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, { color: Colors.income }]}>DAYS UNTIL PAYDAY</Text>
                <Text style={styles.paydayDays}>
                  {payday.days === 0 ? 'Payday today! 🎉' : `${payday.days} day${payday.days === 1 ? '' : 's'}`}
                </Text>
              </View>
              <Text style={styles.paydayDate}>{payday.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
            </>
          ) : (
            <>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, { color: Colors.income }]}>PAYDAY</Text>
                <Text style={styles.paydaySet}>Set your salary days for reminders</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.income} />
            </>
          )}
        </TouchableOpacity>

        {/* ── Projection ── */}
        <TouchableOpacity style={styles.monthCard} onPress={() => router.push('/debt')} accessibilityRole="button" accessibilityHint="Opens your spending and debt plan">
          <View style={styles.monthIcon}>
            <Ionicons name="trending-up-outline" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardLabel, { color: Colors.primary }]}>PROJECTED SPENDING THIS MONTH</Text>
            <AmountText amount={monthEndProjection(month.expenses, now.getDate(), new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())} style={styles.monthAmount} />
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>

        {/* ── Month balance ── */}
        <TouchableOpacity style={styles.monthCard} onPress={() => router.push('/budgets')} accessibilityRole="button">
          <View style={styles.monthIcon}>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardLabel, { color: Colors.primary }]}>LEFT THIS {now.toLocaleString('en-US', { month: 'long' }).toUpperCase()}</Text>
            <AmountText amount={month.net} colorCoded style={styles.monthAmount} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AmountText amount={month.income} style={[styles.small, { color: Colors.income }]} />
            <AmountText amount={-month.expenses} style={[styles.small, { color: Colors.expense }]} />
          </View>
        </TouchableOpacity>

        {/* ── Recent activity ── */}
        <View style={styles.listCard}>
          <TouchableOpacity style={styles.listHeader} onPress={() => router.push('/(tabs)/transactions')} accessibilityRole="button" accessibilityLabel="Recent activity. See all">
            <View style={styles.monthIcon}>
              <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>Recent activity</Text>
              <Text style={styles.listSub}>Your latest income and expenses</Text>
            </View>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
          {recent.length === 0
            ? <EmptyState icon="receipt-outline" text={'No transactions yet.\nTap “+ Expense” to log your first one.'} />
            : recent.map(txn => <TransactionItem key={txn.id} txn={txn} onLongPress={() => handleDeleteTxn(txn)} />)}
        </View>

        <View style={{ height: 96 }} />
      </ScrollView>

      <AddMenu />
    </View>
  );
}

function IconPill({ icon, label, showLabel, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; showLabel?: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.pill} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={18} color={Colors.textSecondary} />
      {showLabel && <Text style={styles.pillText}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.screenBg },
  scroll: { paddingHorizontal: 18 },

  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, minWidth: 44, justifyContent: 'center',
    paddingHorizontal: 12, borderRadius: 22, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  pillText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },

  date: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginTop: 12 },
  greeting: { fontSize: 26, fontWeight: '600', color: Colors.textPrimary, marginTop: 4 },
  name: { fontWeight: '800' },


  row: { flexDirection: 'row', gap: 12, marginTop: 14 },
  card: { backgroundColor: Colors.surface, borderRadius: 18, padding: 14, minHeight: 132, ...shadow },
  cardLabel: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.8 },
  bigAmount: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },

  chart: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 10 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barTrack: { flex: 1, width: 8, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4, fontWeight: '600' },

  paydayCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: 18,
    backgroundColor: Colors.successBg, borderWidth: 1, borderColor: Colors.successBorder,
  },
  paydayDays: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  paydayDate: { fontSize: 15, fontWeight: '800', color: Colors.income },
  paydaySet: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  monthCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: 18,
    backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primaryLight + '40',
  },
  monthIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  monthAmount: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  small: { fontSize: 13, fontWeight: '700' },

  listCard: { marginTop: 14, padding: 14, borderRadius: 18, backgroundColor: Colors.surface, ...shadow },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  listTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  listSub: { fontSize: 13, color: Colors.textSecondary },
  seeAll: { color: Colors.primary, fontSize: 14, fontWeight: '700', padding: 10 },

}));
