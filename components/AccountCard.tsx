import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/Colors';
import type { Account } from '../lib/types';
import { AmountText } from './AmountText';
import { shadow } from './ui';

interface Props {
  account: Account;
  onPress?: () => void;
}

/** Grid tile: tinted with the account's color (text stays dark for AA contrast). */
export function AccountCard({ account, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: account.color + '1F', borderColor: account.color + '55' }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, balance ₱${account.balance.toFixed(2)}`}
    >
      <View style={[styles.badge, { backgroundColor: account.color }]}>
        <Text style={styles.icon}>{account.icon}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>{account.name}</Text>
      <AmountText amount={account.balance} colorCoded={account.balance < 0} style={styles.balance} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: { width: '48%', borderRadius: 18, padding: 14, borderWidth: 1, gap: 8, backgroundColor: Colors.white, ...shadow },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  balance: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
});
