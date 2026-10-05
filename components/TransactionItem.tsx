import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/Colors';
import type { Transaction } from '../lib/types';
import { AmountText } from './AmountText';
import { themed } from './theme';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  txn: Transaction;
  onLongPress?: () => void;
}

const TYPE_SIGN: Record<string, number> = {
  income: 1,
  expense: -1,
  transfer: 0,
};

export function TransactionItem({ txn, onLongPress }: Props) {
  const sign = TYPE_SIGN[txn.type] ?? 0;
  const signedAmount = txn.type === 'expense' ? -txn.amount : txn.amount;

  const typeColor =
    txn.type === 'income' ? Colors.income :
    txn.type === 'expense' ? Colors.expense :
    Colors.transfer;

  const displayIcon = txn.category_icon ?? (
    txn.type === 'income' ? '💰' :
    txn.type === 'transfer' ? '🔄' : '💸'
  );

  return (
    <TouchableOpacity
      style={styles.row}
      onLongPress={onLongPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${txn.memo || txn.category_name || txn.type}, ${txn.type} ${Math.abs(txn.amount).toLocaleString('en-PH')} pesos, ${txn.account_name ?? ''}, ${txn.date}`}
      accessibilityHint={onLongPress ? 'Long press to delete' : undefined}
      accessibilityActions={onLongPress ? [{ name: 'delete', label: 'Delete' }] : undefined}
      onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'delete') onLongPress?.(); }}
    >
      <View style={[styles.iconBadge, { backgroundColor: (txn.category_color ?? typeColor) + '22' }]}>
        <CategoryIcon emoji={displayIcon} size={20} color={txn.category_color ?? typeColor} />
      </View>
      <View style={styles.info}>
        <Text style={styles.memo} numberOfLines={1}>
          {txn.memo || txn.category_name || txn.type}
        </Text>
        <Text style={styles.sub}>
          {txn.account_name}
          {txn.to_account_name ? ` → ${txn.to_account_name}` : ''}
          {' · '}
          {txn.date}
        </Text>
      </View>
      <AmountText
        amount={signedAmount}
        colorCoded
        style={styles.amount}
      />
    </TouchableOpacity>
  );
}

const styles = themed(() => StyleSheet.create({
  // flat row: lives inside a white card on Home and Log
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 56,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  memo: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  amount: { fontSize: 15 },
}));
