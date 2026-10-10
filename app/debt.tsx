/**
 * Paws — Debt (Plan → Debt): spending projection, debt payoff timeline (loans + credit cards), and Paws' advice.
 * Salary + per-debt payment/interest are saved on the phone (AsyncStorage key paws.plan).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { themed } from '../components/theme';
import { CatTip, EmptyState, ui } from '../components/ui';
import Colors from '../constants/Colors';
import { formatAmountInput } from '../lib/amount';
import { useDb } from '../lib/db/DbContext';
import { getAccounts, getActiveProfile, getTransactionsByDateRange } from '../lib/db/queries';
import {
  addMonths, advice, monthEndProjection, monthsToPayoff, payoffPlan, type Debt, type Strategy,
} from '../lib/projection';
import { localISO } from '../lib/paydayDates';
import { CategoryIcon } from '../components/CategoryIcon';

const KEY = 'paws.plan';
type Saved = { salary: string; debts: Record<number, { payment: string; apr: string }> };

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;
const num = (s: string | undefined) => { const n = Number((s ?? '').replace(/,/g, '')); return Number.isFinite(n) && n > 0 ? n : 0; };
const when = (months: number) => Number.isFinite(months)
  ? `${months} month${months === 1 ? '' : 's'} · ${addMonths(new Date(), months).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
  : 'Never at this payment';

export default function DebtScreen() {
  const db = useDb();
  const [saved, setSaved] = useState<Saved>({ salary: '', debts: {} });
  const [debtAccounts, setDebtAccounts] = useState<{ id: number; name: string; icon: string; owed: number }[]>([]);
  const [stats, setStats] = useState({ spentMonth: 0, day: 1, daysInMonth: 30, avgExpenses: 0, avgIncome: 0 });
  const [topCategory, setTopCategory] = useState<{ name: string; share: number } | null>(null);
  const [strategy, setStrategy] = useState<Strategy>('avalanche');

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(KEY).catch(() => null);
    if (raw) { try { setSaved(JSON.parse(raw)); } catch { /* keep defaults */ } }
    const p = await getActiveProfile(db);
    if (!p) return;
    const now = new Date();
    const today = localISO(now);
    const from = localISO(new Date(now.getTime() - 89 * 864e5));
    const [accounts, txns] = await Promise.all([getAccounts(db, p.id), getTransactionsByDateRange(db, p.id, from, today)]);

    // loans/cards: whatever the sign the user entered, the size of the balance is what's owed
    setDebtAccounts(accounts.filter(a => (a.type === 'loan' || a.type === 'credit_card') && a.balance !== 0)
      .map(a => ({ id: a.id, name: a.name, icon: a.icon, owed: Math.abs(a.balance) })));

    const expenses = txns.filter(t => t.type === 'expense');
    const income = txns.filter(t => t.type === 'income');
    const first = txns.reduce((m, t) => (t.date < m ? t.date : m), today);
    const daysCovered = Math.max(1, Math.round((Date.parse(today) - Date.parse(first)) / 864e5) + 1);
    const perMonth = (sum: number) => (sum / daysCovered) * 30.4; // averages over the history we actually have (≤ 90 days)
    const sum = (ts: typeof txns) => ts.reduce((s, t) => s + t.amount, 0);
    const monthStart = `${today.slice(0, 7)}-01`;
    setStats({
      spentMonth: sum(expenses.filter(t => t.date >= monthStart)),
      day: now.getDate(),
      daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
      avgExpenses: perMonth(sum(expenses)),
      avgIncome: perMonth(sum(income)),
    });
    const byCat = new Map<string, number>();
    expenses.forEach(t => t.category_name && byCat.set(t.category_name, (byCat.get(t.category_name) ?? 0) + t.amount));
    const top = [...byCat].sort((a, b) => b[1] - a[1])[0];
    setTopCategory(top && sum(expenses) > 0 ? { name: top[0], share: top[1] / sum(expenses) } : null);
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const update = (next: Saved) => { setSaved(next); AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {}); };
  const setDebt = (id: number, field: 'payment' | 'apr', v: string) =>
    update({ ...saved, debts: { ...saved.debts, [id]: { ...{ payment: '', apr: '' }, ...saved.debts[id], [field]: v } } });

  const salary = num(saved.salary);
  const debts: Debt[] = debtAccounts.map(a => ({
    id: a.id, name: a.name, owed: a.owed, payment: num(saved.debts[a.id]?.payment), apr: num(saved.debts[a.id]?.apr),
  }));
  const totalOwed = debts.reduce((s, d) => s + d.owed, 0);
  const payments = debts.reduce((s, d) => s + d.payment, 0);
  const free = salary - stats.avgExpenses - payments;
  const base = payoffPlan(debts, 0, strategy);
  const boosted = payoffPlan(debts, Math.max(0, free), strategy);
  const projected = monthEndProjection(stats.spentMonth, stats.day, stats.daysInMonth);
  const tips = advice({ salary, avgExpenses: stats.avgExpenses, debts, topCategory });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={ui.screen} contentContainerStyle={[ui.scroll, { paddingTop: 4 }]} keyboardShouldPersistTaps="handled">
        <CatTip text={tips[0]} />

        {/* Spending projection */}
        <Text style={ui.section}>SPENDING</Text>
        <View style={styles.row}>
          <View style={[ui.card, styles.half]}>
            <Text style={ui.label}>THIS MONTH (PROJECTED)</Text>
            <Text style={styles.big}>{peso(projected)}</Text>
            <Text style={styles.sub}>{peso(stats.spentMonth)} so far · day {stats.day}/{stats.daysInMonth}</Text>
          </View>
          <View style={[ui.card, styles.half]}>
            <Text style={ui.label}>AVERAGE / MONTH</Text>
            <Text style={styles.big}>{peso(stats.avgExpenses)}</Text>
            <Text style={styles.sub}>last 90 days</Text>
          </View>
        </View>

        {/* Salary */}
        <Text style={ui.section}>MONTHLY SALARY</Text>
        <View style={ui.card}>
          <View style={styles.inputRow}>
            <Text style={styles.currency}>₱</Text>
            <TextInput
              style={styles.salaryInput}
              value={saved.salary}
              onChangeText={v => update({ ...saved, salary: formatAmountInput(v) })}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.textMuted}
              accessibilityLabel="Monthly salary in pesos"
            />
          </View>
          {stats.avgIncome > 0 && Math.round(stats.avgIncome) !== Math.round(salary) && (
            <TouchableOpacity onPress={() => update({ ...saved, salary: formatAmountInput(String(Math.round(stats.avgIncome))) })} accessibilityRole="button">
              <Text style={styles.link}>Use my logged income: {peso(stats.avgIncome)}/mo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Debts */}
        <Text style={ui.section}>LOANS & CREDIT CARDS</Text>
        <View style={styles.row}>
          {([['credit_card', 'Credit card'], ['loan', 'Loan']] as const).map(([type, label]) => (
            <TouchableOpacity key={type} style={styles.addBtn} accessibilityRole="button" accessibilityLabel={`Add ${label}`}
              onPress={() => router.push({ pathname: '/modal/add-account', params: { type } })}>
              <Ionicons name="add" size={18} color={Colors.primary} />
              <Text style={styles.addText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {debts.length === 0 ? (
          <EmptyState icon="happy-outline" text={'No loans or credit card balances.\nTap + above to add one and plan its payoff.'} />
        ) : debtAccounts.map(a => {
          const d = debts.find(x => x.id === a.id)!;
          const months = monthsToPayoff(d.owed, d.payment, d.apr);
          return (
            <View key={a.id} style={ui.card}>
              <View style={styles.debtHead}>
                <CategoryIcon emoji={a.icon} size={18} color={Colors.expense} />
                <Text style={styles.debtName} numberOfLines={1}>{a.name}</Text>
                <Text style={styles.owed}>{peso(d.owed)}</Text>
              </View>
              <View style={styles.row}>
                <Field label="Monthly payment (₱)" value={saved.debts[a.id]?.payment ?? ''} onChange={v => setDebt(a.id, 'payment', v)} />
                <Field label="Interest % / year" value={saved.debts[a.id]?.apr ?? ''} onChange={v => setDebt(a.id, 'apr', v)} placeholder="0" />
              </View>
              <View style={styles.resultRow}>
                <Ionicons name={Number.isFinite(months) ? 'flag-outline' : 'warning-outline'} size={18}
                  color={Number.isFinite(months) ? Colors.income : Colors.expense} />
                <Text style={[styles.result, !Number.isFinite(months) && { color: Colors.expense }]}>
                  {d.payment > 0 ? `Paid off in ${when(months)}` : 'Enter a monthly payment'}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Summary */}
        {debts.length > 0 && (
          <View style={ui.tintCard}>
            <Text style={styles.cardTitle}>Your debt-free plan</Text>
            <Line label="Total owed" value={peso(totalOwed)} />
            <Line label="Monthly payments" value={peso(payments)} />
            <Line label="Free cash after spending & payments" value={peso(free)} color={free >= 0 ? Colors.income : Colors.expense} />
            <View style={styles.segment} accessibilityRole="tablist">
              {(['avalanche', 'snowball'] as const).map(s => (
                <TouchableOpacity key={s} style={[styles.segItem, strategy === s && styles.segOn]} onPress={() => setStrategy(s)}
                  accessibilityRole="tab" accessibilityState={{ selected: strategy === s }}>
                  <Text style={[styles.segText, strategy === s && { color: Colors.onPrimary }]}>
                    {s === 'avalanche' ? 'Highest interest first' : 'Smallest first'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Line label="Paying the amounts above" value={when(base.months)} />
            {free > 0 && <Line label={`+ your free ${peso(free)}/mo`} value={when(boosted.months)} color={Colors.income} />}
            {Number.isFinite(base.months) && base.interest > 0 && (
              <Text style={styles.sub}>Interest you’ll pay: {peso(base.interest)}{free > 0 && Number.isFinite(boosted.months) ? ` (or ${peso(boosted.interest)} with extra)` : ''}</Text>
            )}
          </View>
        )}

        {/* Advice */}
        {tips.length > 1 && (
          <>
            <Text style={ui.section}>PAWS’ ADVICE</Text>
            <View style={ui.card}>
              {tips.slice(1).map(t => (
                <View key={t} style={styles.tip}>
                  <Ionicons name="paw" size={16} color={Colors.primary} style={{ marginTop: 2 }} />
                  <Text style={styles.tipText}>{t}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        <Text style={styles.disclaimer}>Estimates only, based on what you’ve logged. Not financial advice.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder = '0' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.field} value={value} onChangeText={v => onChange(formatAmountInput(v))} placeholder={placeholder}
        keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} accessibilityLabel={label} />
    </View>
  );
}

function Line({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={[styles.lineValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 46, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.surface,
  },
  addText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  half: { flex: 1, padding: 14 },
  big: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  currency: { fontSize: 24, fontWeight: '700', color: Colors.textMuted, marginRight: 6 },
  salaryInput: { flex: 1, fontSize: 28, fontWeight: '800', color: Colors.textPrimary, paddingVertical: 4 },
  link: { color: Colors.primary, fontWeight: '700', fontSize: 14, paddingTop: 10 },
  debtHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 },
  debtName: { flex: 1, fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  owed: { fontSize: 16, fontWeight: '800', color: Colors.expense },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  field: {
    backgroundColor: Colors.offWhite, borderRadius: 12, paddingHorizontal: 12, minHeight: 46,
    fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  result: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 10 },
  lineLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  lineValue: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  segment: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 4, marginVertical: 10, borderWidth: 1, borderColor: Colors.border },
  segItem: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: Colors.primary },
  segText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  tip: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20, color: Colors.textPrimary },
  disclaimer: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 18 },
}));
