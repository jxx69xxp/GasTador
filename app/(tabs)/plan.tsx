/**
 * Paws — Plan hub: Overview, then Category budget / Goals / Debt / Owed to you / Planned payments /
 * Travel / Tags / Tools.
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

  const sections: [keyof typeof Ionicons.glyphMap, string, string, Href][] = [
    ['pie-chart-outline', 'Category budget', o.budgets ? `${peso(o.budgetLeft)} left of ${peso(o.budgetTotal)}` : 'Set monthly limits per category', '/budgets'],
    ['trophy-outline', 'Personal goals', o.goals ? `${peso(o.goalsSaved)} saved of ${peso(o.goalsTarget)}` : 'Save for what matters', '/list/goals'],
    ['trending-down-outline', 'Debt', o.debt ? `${peso(o.debt)} owed · see payoff date` : 'Loans & credit cards payoff plan', '/debt'],
    ['people-outline', 'Money owed to you', o.owed ? `${peso(o.owed)} to collect` : 'Track who owes you', '/list/owed'],
    ['calendar-outline', 'Planned payments', o.planned ? `${peso(o.planned)} every month` : 'Rent, bills, subscriptions', '/list/planned'],
    ['airplane-outline', 'Travel', o.trips ? `${o.trips} trip${o.trips === 1 ? '' : 's'} planned` : 'Trip budgets tracked by tag', '/list/trips'],
    ['pricetags-outline', 'Tags', 'Spending by #tag in notes', '/tags'],
    ['construct-outline', 'Tools', 'Savings & loan calculators', '/tools'],
  ];

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Plan" subtitle="Budgets, goals and what’s coming" />
      <ScrollView contentContainerStyle={ui.scroll}>
        <Text style={ui.section}>OVERVIEW</Text>
        <View style={ui.card}>
          <Stat label="Budget left this month" value={peso(o.budgetLeft)} color={o.budgetLeft < 0 ? Colors.expense : Colors.income} />
          <Stat label="Saved toward goals" value={peso(o.goalsSaved)} />
          <Stat label="Debt owed" value={peso(o.debt)} color={o.debt ? Colors.expense : undefined} />
          <Stat label="Owed to you" value={peso(o.owed)} />
          <Stat label="Planned payments / month" value={peso(o.planned)} />
        </View>

        {sections.map(([icon, title, sub, href]) => (
          <TouchableOpacity key={title} style={[ui.card, styles.row]} onPress={() => router.push(href)} accessibilityRole="button">
            <View style={styles.icon}><Ionicons name={icon} size={22} color={Colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  stat: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  statLabel: { fontSize: 14, color: Colors.textSecondary },
  statValue: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10, paddingVertical: 14 },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
}));
