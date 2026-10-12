import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/Colors';
import type { Account } from '../lib/types';
import { AmountText } from './AmountText';
import { mix, shadow } from './ui';
import { themed } from './theme';
import { AccountIcon } from './AccountIcon';

interface Props {
  account: Account;
  onPress?: () => void;
  list?: boolean; // row layout for Wallet's list view
}

/** Grid tile tinted with the account's color. Opaque tint (see mix) so Android's shadow doesn't bleed through. */
export function AccountCard({ account, onPress, list }: Props) {
  const debt = account.type === 'loan' || account.type === 'credit_card'; // always shown as owed
  return (
    <TouchableOpacity
      style={[list ? styles.row : styles.tile, { backgroundColor: mix(account.color, Colors.surface, 0.12), borderColor: mix(account.color, Colors.surface, 0.35) }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, balance ₱${account.balance.toFixed(2)}`}
    >
      <View style={[styles.badge, { backgroundColor: account.color }]}>
        <AccountIcon name={account.name} icon={account.icon} size={20} box={40} color="#FFFFFF" />
      </View>
      <Text style={[styles.name, list && { flex: 1, fontSize: 15 }]} numberOfLines={1}>{account.name}</Text>
      <AmountText amount={debt ? -Math.abs(account.balance) : account.balance} colorCoded={debt || account.balance < 0} style={[styles.balance, list && { fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} />
    </TouchableOpacity>
  );
}

const styles = themed(() => StyleSheet.create({
  tile: { width: '48%', borderRadius: 18, padding: 14, borderWidth: 1, gap: 8, backgroundColor: Colors.surface, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, minHeight: 64, backgroundColor: Colors.surface },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  balance: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
}));
