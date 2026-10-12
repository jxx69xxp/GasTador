/**
 * Paws — Plan hub: three grouped lists (This month / Savings & debt / More).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, type Href } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { themed } from '../../components/theme';
import { ScreenHeader, ui } from '../../components/ui';
import Colors from '../../constants/Colors';
import { useDb } from '../../lib/db/DbContext';
import { getAccounts, getActiveProfile, getBudgets } from '../../lib/db/queries';
import type { PlanItem } from '../../lib/planMath';
import { loadPlanList } from '../../lib/planStore';

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;
const sum = (items: PlanItem[], k: string, f: (i: PlanItem) => boolean = () => true) =>
  items.filter(f).reduce((s, i) => s + (Number(i[k]) || 0), 0);

export default function PlanHub() {
  const db = useDb();
  const [o, setO] = useState({ budgetLeft: 0, budgetTotal: 0, debt: 0, goalsSaved: 0, goalsTarget: 0, owed: 0, planned: 0, trips: 0, goals: 0, budgets: 0 });

  useFocusEffect(useCallback(() => {
    (async () => {
      const p = await getActiveProfile(db);
      if (!p) return;
      const now = new Date();
      const [budgets, accounts, goals, owed, planned, trips] = await Promise.all([
        getBudgets(db, p.id, now.getFullYear(), now.getMonth() + 1), getAccounts(db, p.id),
        loadPlanList('goals'), loadPlanList('owed'), loadPlanList('planned'), loadPlanList('trips'),
      ]);
      const budgetTotal = budgets.reduce((s, b) => s + b.amount, 0);
      setO({
        budgetTotal, budgets: budgets.length,
        budgetLeft: budgetTotal - budgets.reduce((s, b) => s + (b.spent ?? 0), 0),
        debt: accounts.filter(a => a.type === 'loan' || a.type === 'credit_card').reduce((s, a) => s + Math.abs(a.balance), 0),
        goalsSaved: sum(goals, 'saved'), goalsTarget: sum(goals, 'target'), goals: goals.length,
        owed: sum(owed, 'amount', i => !i.settled),
        planned: sum(planned, 'amount'),
        trips: trips.length,
      });
    })();
  }, [db]));

  type Row = [keyof typeof Ionicons.glyphMap, string, string, Href];
  // Three short groups instead of one long list; each subtitle carries its live number, so no separate overview.
  const groups: [string, Row[]][] = [
    ['THIS MONTH', [
      ['pie-chart-outline', 'Category budget', o.budgets ? `${peso(o.budgetLeft)} left of ${peso(o.budgetTotal)}` : 'Set monthly limits per category', '/budgets'],
      ['calendar-outline', 'Planned payments', o.planned ? `${peso(o.planned)} every month` : 'Rent, bills, subscriptions', '/list/planned'],
      ['alarm-outline', 'Reminders', 'Pick any date on the calendar', '/list/reminders'],
    ]],
    ['SAVINGS & DEBT', [
      ['trophy-outline', 'Personal goals', o.goals ? `${peso(o.goalsSaved)} saved of ${peso(o.goalsTarget)}` : 'Save for what matters', '/list/goals'],
      ['trending-down-outline', 'Debt', o.debt ? `${peso(o.debt)} owed · see payoff date` : 'Loans & credit cards payoff plan', '/debt'],
      ['people-outline', 'Money owed to you', o.owed ? `${peso(o.owed)} to collect` : 'Track who owes you', '/list/owed'],
    ]],
    ['MORE', [
      ['airplane-outline', 'Travel', o.trips ? `${o.trips} trip${o.trips === 1 ? '' : 's'} planned` : 'Trip budgets tracked by tag', '/list/trips'],
      ['pricetags-outline', 'Tags', 'Spending by #tag in notes', '/tags'],
      ['construct-outline', 'Tools', 'Savings & loan calculators', '/tools'],
    ]],
  ];

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Plan" subtitle="Budgets, goals and what’s coming" />
      <ScrollView contentContainerStyle={ui.scroll}>
        {groups.map(([label, rows]) => (
          <View key={label}>
            <Text style={ui.section}>{label}</Text>
            <View style={[ui.card, styles.group]}>
              {rows.map(([icon, title, sub, href], i) => (
                <TouchableOpacity
                  key={title}
                  style={[styles.row, i > 0 && styles.divider]}
                  onPress={() => router.push(href)}
                  accessibilityRole="button"
                  accessibilityLabel={`${title}. ${sub}`}
                >
                  <View style={styles.icon}><Ionicons name={icon} size={20} color={Colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  group: { paddingVertical: 0, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 56 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
}));
