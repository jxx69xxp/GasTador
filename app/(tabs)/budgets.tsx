/**
 * MeowMeow — Budgets Screen
 * Monthly budget limits per category with visual progress bars
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
import { BudgetBar } from '../../components/BudgetBar';
import Colors from '../../constants/Colors';
import { deleteBudget, getActiveProfile, getBudgets, getMonthlySummary } from '../../lib/db/queries';
import type { Budget, DailySummary, Profile } from '../../lib/types';

const NOW = new Date();

export default function BudgetsScreen() {
  const db = useDb();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [monthSummary, setMonthSummary] = useState<DailySummary>({ income: 0, expenses: 0, net: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const p = await getActiveProfile(db);
    if (!p) return;
    setProfile(p);
    const [buds, summary] = await Promise.all([
      getBudgets(db, p.id, NOW.getFullYear(), NOW.getMonth() + 1),
      getMonthlySummary(db, p.id, NOW.getFullYear(), NOW.getMonth() + 1),
    ]);
    setBudgets(buds);
    setMonthSummary(summary);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleDeleteBudget = useCallback((budget: Budget) => {
    Alert.alert('Remove Budget', `Remove budget for "${budget.category_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => { await deleteBudget(db, budget.id); load(); },
      },
    ]);
  }, [db, load]);

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent ?? 0), 0);
  const monthName = NOW.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Overview */}
        <View style={styles.overview}>
          <Text style={styles.overviewMonth}>{monthName}</Text>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Total Budget</Text>
              <Text style={styles.overviewValue}>₱{totalBudget.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Spent</Text>
              <Text style={[styles.overviewValue, { color: Colors.expense }]}>
                ₱{totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Remaining</Text>
              <Text style={[styles.overviewValue, { color: Colors.income }]}>
                ₱{Math.max(0, totalBudget - totalSpent).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {budgets.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={styles.emptyText}>No budgets set yet.{'\n'}Tap + to set a category budget.</Text>
            </View>
          ) : (
            budgets.map(b => (
              <TouchableOpacity key={b.id} onLongPress={() => handleDeleteBudget(b)} activeOpacity={0.9}>
                <BudgetBar budget={b} />
              </TouchableOpacity>
            ))
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/modal/add-budget')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Set budget"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.screenBg },
  scroll: { flexGrow: 1 },
  overview: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  overviewMonth: { color: Colors.white + 'AA', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  overviewRow: { flexDirection: 'row', gap: 8 },
  overviewItem: { flex: 1 },
  overviewLabel: { color: Colors.white + 'AA', fontSize: 11, marginBottom: 4 },
  overviewValue: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  content: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 60 },
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
