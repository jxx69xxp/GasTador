import { router } from 'expo-router';
import React, { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Colors from '../constants/Colors';
import type { Transaction } from '../lib/types';
import { AmountText } from './AmountText';
import { themed } from './theme';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  txn: Transaction;
  onDelete: () => void;
}

const TYPE_SIGN: Record<string, number> = {
  income: 1,
  expense: -1,
  transfer: 0,
};

export function TransactionItem({ txn, onDelete }: Props) {
  const swipe = useRef<Swipeable>(null);
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

  // edit = the add sheet prefilled; saving posts the new entry and removes this one (see add-transaction)
  const edit = () => {
    swipe.current?.close();
    router.push({ pathname: '/modal/add-transaction', params: {
      edit: String(txn.id), type: txn.type, amount: String(txn.amount), memo: txn.memo ?? '', date: txn.date,
      category: txn.category_name ?? '', account: String(txn.account_id), to: String(txn.to_account_id ?? ''),
    } });
  };
  const remove = () => { swipe.current?.close(); onDelete(); };

  return (
    <Swipeable
      ref={swipe}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.action, { backgroundColor: Colors.primary }]} onPress={edit} accessibilityRole="button" accessibilityLabel="Edit">
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.action, { backgroundColor: Colors.expense }]} onPress={remove} accessibilityRole="button" accessibilityLabel="Delete">
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    >
    <TouchableOpacity
      style={styles.row}
      onPress={edit}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${txn.memo || txn.category_name || txn.type}, ${txn.type} ${Math.abs(txn.amount).toLocaleString('en-PH')} pesos, ${txn.account_name ?? ''}, ${txn.date}`}
      accessibilityHint="Tap to edit. Swipe left to edit or delete"
      accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
      onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'delete') onDelete(); }}
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
    </Swipeable>
  );
}

const styles = themed(() => StyleSheet.create({
  // flat row: lives inside a white card on Home and Log
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 56,
    backgroundColor: Colors.surface, // covers the actions until swiped
  },
  actions: { flexDirection: 'row' },
  action: { width: 72, justifyContent: 'center', alignItems: 'center' },
  actionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
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
