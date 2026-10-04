/**
 * Paws — Budgets Screen
 * Monthly overview, a tip from Paws, and per-category progress bars.
 */
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BudgetBar } from '../../components/BudgetBar';
import { CatTip, EmptyState, Fab, ScreenHeader, ui } from '../../components/ui';
import Colors from '../../constants/Colors';
import { useDb } from '../../lib/db/DbContext';
import { deleteBudget, getActiveProfile, getBudgets } from '../../lib/db/queries';
import type { Budget } from '../../lib/types';
import { themed } from '../../components/theme';

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;

function budgetTip(budgets: Budget[]) {
  if (budgets.length === 0) return 'Set a monthly limit for a category and I’ll warn you before you go over.';
  const over = budgets.filter(b => (b.spent ?? 0) > b.amount);
  if (over.length) return `${over[0].category_name} is over budget by ${peso((over[0].spent ?? 0) - over[0].amount)}. Paws before you spend!`;
  const near = budgets.find(b => b.amount > 0 && (b.spent ?? 0) / b.amount >= 0.8);
  if (near) return `Careful, ${near.category_name} is at ${Math.round(((near.spent ?? 0) / near.amount) * 100)}% of its budget.`;
  return 'Everything is within budget. Purr-fect!';
}

export default function BudgetsScreen() {
  const db = useDb();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const p = await getActiveProfile(db);
    if (!p) return;
    const now = new Date();
    setBudgets(await getBudgets(db, p.id, now.getFullYear(), now.getMonth() + 1));
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleDeleteBudget = useCallback((budget: Budget) => {
    Alert.alert('Remove Budget', `Remove budget for "${budget.category_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteBudget(db, budget.id); load(); } },
    ]);
  }, [db, load]);

  const total = budgets.reduce((s, b) => s + b.amount, 0);
  const spent = budgets.reduce((s, b) => s + (b.spent ?? 0), 0);
  const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;
  const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Budgets" subtitle={monthName} />
      <ScrollView
        contentContainerStyle={ui.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={ui.card}>
          <Text style={ui.label}>REMAINING THIS MONTH</Text>
          <Text style={styles.big}>{peso(Math.max(0, total - spent))}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%`, backgroundColor: spent > total ? Colors.expense : Colors.primary }]} />
          </View>
          <View style={styles.split}>
            <Text style={styles.splitText}>{peso(spent)} spent</Text>
            <Text style={styles.splitText}>of {peso(total)} budget</Text>
          </View>
        </View>

        <CatTip text={budgetTip(budgets)} />

        <Text style={ui.section}>CATEGORIES</Text>
        {budgets.length === 0 ? (
          <EmptyState icon="pie-chart-outline" text={'No budgets yet.\nTap “+ Budget” to set one.'} />
        ) : (
          budgets.map(b => (
            <TouchableOpacity
              key={b.id}
              onLongPress={() => handleDeleteBudget(b)}
              activeOpacity={0.9}
              accessibilityHint="Long press to remove this budget"
            >
              <BudgetBar budget={b} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Fab label="Budget" onPress={() => router.push('/modal/add-budget')} />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  big: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  track: { height: 10, borderRadius: 5, backgroundColor: Colors.border, overflow: 'hidden', marginTop: 12 },
  fill: { height: '100%', borderRadius: 5 },
  split: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  splitText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
}));
