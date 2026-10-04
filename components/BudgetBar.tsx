import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '../constants/Colors';
import type { Budget } from '../lib/types';
import { shadow } from './ui';

interface Props {
  budget: Budget;
}

function formatPHP(n: number) {
  return `₱${Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function BudgetBar({ budget }: Props) {
  const spent = budget.spent ?? 0;
  const limit = budget.amount;
  const ratio = limit > 0 ? Math.min(spent / limit, 1) : 0;
  const pct = Math.round(ratio * 100);
  const over = spent > limit;

  const barColor = over ? Colors.expense : ratio > 0.8 ? Colors.gold : Colors.primaryLight;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.leftRow}>
          <Text style={styles.icon}>{budget.category_icon}</Text>
          <Text style={styles.name}>{budget.category_name}</Text>
        </View>
        <Text style={[styles.pct, { color: barColor }]}>{pct}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.spent}>{formatPHP(spent)} spent</Text>
        <Text style={[styles.remaining, { color: over ? Colors.expense : Colors.textSecondary }]}>
          {over ? `${formatPHP(spent - limit)} over` : `${formatPHP(limit - spent)} left`}
          {' / '}{formatPHP(limit)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16, marginTop: 10, ...shadow },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  leftRow: { flexDirection: 'row', alignItems: 'center' },
  icon: { fontSize: 18, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  pct: { fontSize: 13, fontWeight: '700' },
  track: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fill: { height: '100%', borderRadius: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  spent: { fontSize: 13, color: Colors.textSecondary },
  remaining: { fontSize: 13, fontWeight: '600' },
});
