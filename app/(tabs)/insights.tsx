/**
 * Paws — Insights: this month's totals, spending by category, 6-month trend, and top tags.
 */
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AmountText } from '../../components/AmountText';
import { themed } from '../../components/theme';
import { CatTip, ScreenHeader, ui } from '../../components/ui';
import Colors from '../../constants/Colors';
import { useDb } from '../../lib/db/DbContext';
import { getActiveProfile, getTransactionsByDateRange } from '../../lib/db/queries';
import { tagTotals } from '../../lib/planMath';
import { localISO } from '../../lib/paydayDates';
import { CategoryIcon } from '../../components/CategoryIcon';

type Slice = { name: string; icon: string; color: string; total: number };
type MonthRow = { label: string; income: number; expenses: number };
const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;

export default function InsightsScreen() {
  const db = useDb();
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [slices, setSlices] = useState<Slice[]>([]);
  const [tags, setTags] = useState<[string, { spent: number }][]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const p = await getActiveProfile(db);
    if (!p) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const txns = await getTransactionsByDateRange(db, p.id, `${ym(start)}-01`, localISO(now));

    const rows = new Map<string, MonthRow>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      rows.set(ym(d), { label: d.toLocaleDateString('en-US', { month: 'short' }), income: 0, expenses: 0 });
    }
    const thisMonth = ym(now);
    const byCat = new Map<string, Slice>();
    for (const t of txns) {
      const r = rows.get(t.date.slice(0, 7));
      if (!r) continue;
      if (t.type === 'income') r.income += t.amount;
      if (t.type !== 'expense') continue;
      r.expenses += t.amount;
      if (t.date.slice(0, 7) !== thisMonth) continue;
      const key = t.category_name ?? 'Uncategorized';
      const s = byCat.get(key) ?? { name: key, icon: t.category_icon ?? '📦', color: t.category_color ?? Colors.textMuted, total: 0 };
      s.total += t.amount;
      byCat.set(key, s);
    }
    setMonths([...rows.values()]);
    setSlices([...byCat.values()].sort((a, b) => b.total - a.total));
    setTags([...tagTotals(txns)].sort((a, b) => b[1].spent - a[1].spent).slice(0, 5));
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const cur = months[5] ?? { income: 0, expenses: 0 };
  const prev = months[4] ?? { income: 0, expenses: 0 };
  const past = months.slice(0, 5).filter(m => m.expenses > 0);
  const avg = past.length ? past.reduce((s, m) => s + m.expenses, 0) / past.length : 0;
  const max = Math.max(1, ...months.flatMap(m => [m.income, m.expenses]));
  const monthName = new Date().toLocaleString('en-US', { month: 'long' });
  const tip = !cur.expenses ? 'Log a few expenses and I’ll show where your money goes.'
    : prev.expenses ? `You’ve spent ${peso(cur.expenses)} this month, ${cur.expenses > prev.expenses ? `${peso(cur.expenses - prev.expenses)} more` : `${peso(prev.expenses - cur.expenses)} less`} than last month.`
    : `You’ve spent ${peso(cur.expenses)} this month.`;

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Insights" subtitle="Patterns in your spending" />
      <ScrollView
        contentContainerStyle={ui.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <CatTip text={tip} />

        <View style={styles.statsRow}>
          <Stat label="INCOME" amount={cur.income} color={Colors.income} />
          <Stat label="SPENT" amount={cur.expenses} color={Colors.expense} />
          <Stat label="NET" amount={cur.income - cur.expenses} color={cur.income >= cur.expenses ? Colors.income : Colors.expense} />
        </View>

        {/* Spending by category */}
        <View style={ui.card}>
          <Text style={styles.cardTitle}>Spending in {monthName}</Text>
          <Text style={styles.cardSub}>By category</Text>
          {slices.length === 0 ? <Text style={styles.muted}>No expenses yet this month.</Text> : (
            <>
              <View style={styles.stack} accessibilityLabel={`Top category: ${slices[0].name}, ${Math.round((slices[0].total / cur.expenses) * 100)} percent`}>
                {slices.map(s => <View key={s.name} style={{ flex: s.total, backgroundColor: s.color }} />)}
              </View>
              {slices.slice(0, 5).map(s => (
                <View key={s.name} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: s.color }]} />
                  <CategoryIcon emoji={s.icon} size={16} color={s.color} />
                  <Text style={styles.legendName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.legendPct}>{Math.round((s.total / cur.expenses) * 100)}%</Text>
                  <Text style={styles.legendAmt}>{peso(s.total)}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* 6-month trend */}
        <View style={ui.card}>
          <Text style={styles.cardTitle}>Last 6 months</Text>
          <Text style={styles.cardSub}>{avg ? `Average spending ${peso(avg)} / month` : 'Income vs spending'}</Text>
          <View style={styles.chart} accessible accessibilityLabel={months.map(m => `${m.label}: income ${peso(m.income)}, spent ${peso(m.expenses)}`).join('. ')}>
            {months.map(m => (
              <View key={m.label} style={styles.col}>
                <View style={styles.bars}>
                  <View style={[styles.bar, { height: `${(m.income / max) * 100}%`, backgroundColor: Colors.income }]} />
                  <View style={[styles.bar, { height: `${(m.expenses / max) * 100}%`, backgroundColor: Colors.expense }]} />
                </View>
                <Text style={styles.colLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: Colors.income }]} /><Text style={styles.legendSmall}>Income</Text>
            <View style={[styles.dot, { backgroundColor: Colors.expense, marginLeft: 14 }]} /><Text style={styles.legendSmall}>Spent</Text>
          </View>
        </View>

        {/* Top tags */}
        {tags.length > 0 && (
          <View style={ui.card}>
            <Text style={styles.cardTitle}>Top tags</Text>
            <Text style={styles.cardSub}>Last 6 months</Text>
            {tags.map(([tag, v]) => (
              <View key={tag} style={styles.legendRow}>
                <Text style={[styles.legendName, { color: Colors.primary }]}>#{tag}</Text>
                <Text style={styles.legendAmt}>{peso(v.spent)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <View style={[ui.card, styles.stat]}>
      <Text style={ui.label}>{label}</Text>
      <AmountText amount={amount} style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit />
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
  chart: { flexDirection: 'row', height: 140, alignItems: 'flex-end', gap: 8 },
  col: { flex: 1, alignItems: 'center', height: '100%' },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 9, borderRadius: 4, minHeight: 2 },
  colLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 6, fontWeight: '600' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  legendSmall: { fontSize: 12, color: Colors.textSecondary },
}));
