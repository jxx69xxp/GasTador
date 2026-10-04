import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/Colors';
import type { Account } from '../lib/types';
import { AmountText } from './AmountText';
import { mix, shadow } from './ui';
import { themed } from './theme';

interface Props {
  account: Account;
  onPress?: () => void;
}

/** Grid tile tinted with the account's color. Opaque tint (see mix) so Android's shadow doesn't bleed through. */
export function AccountCard({ account, onPress }: Props) {
  const debt = account.type === 'loan' || account.type === 'credit_card'; // always shown as owed
  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: mix(account.color, Colors.surface, 0.12), borderColor: mix(account.color, Colors.surface, 0.35) }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, balance ₱${account.balance.toFixed(2)}`}
    >
      <View style={[styles.badge, { backgroundColor: account.color }]}>
        <Text style={styles.icon}>{account.icon}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>{account.name}</Text>
      <AmountText amount={debt ? -Math.abs(account.balance) : account.balance} colorCoded={debt || account.balance < 0} style={styles.balance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} />
    </TouchableOpacity>
  );
}

const styles = themed(() => StyleSheet.create({
  tile: { width: '48%', borderRadius: 18, padding: 14, borderWidth: 1, gap: 8, backgroundColor: Colors.surface, ...shadow },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  balance: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
}));
