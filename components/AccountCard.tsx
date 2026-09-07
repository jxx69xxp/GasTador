import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/Colors';
import type { Account } from '../lib/types';
import { AmountText } from './AmountText';

interface Props {
  account: Account;
  onPress?: () => void;
}

export function AccountCard({ account, onPress }: Props) {
  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: account.color }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.row}>
        <View style={[styles.iconBadge, { backgroundColor: account.color + '22' }]}>
          <Text style={styles.icon}>{account.icon}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{account.name}</Text>
          <Text style={styles.type}>{account.type.replace('_', ' ')}</Text>
        </View>
        <AmountText
          amount={account.balance}
          colorCoded
          style={styles.balance}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  type: { fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize', marginTop: 2 },
  balance: { fontSize: 16 },
});
