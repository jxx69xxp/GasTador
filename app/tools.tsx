/**
 * Paws — Tools: quick calculators (reuse monthsToPayoff) + shortcuts to existing planners.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { themed } from '../components/theme';
import { ui } from '../components/ui';
import Colors from '../constants/Colors';
import { formatAmountInput } from '../lib/amount';
import { addMonths, monthsToPayoff } from '../lib/projection';

const num = (s: string) => { const n = Number(s.replace(/,/g, '')); return Number.isFinite(n) && n > 0 ? n : 0; };
const result = (m: number, what: string) => !Number.isFinite(m) ? `This never ${what}. Increase the monthly amount.`
  : `${m} month${m === 1 ? '' : 's'} · ${addMonths(new Date(), m).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

export default function ToolsScreen() {
  const [save, setSave] = useState({ target: '', monthly: '' });
  const [loan, setLoan] = useState({ owed: '', payment: '', rate: '' });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={ui.screen} contentContainerStyle={[ui.scroll, { paddingTop: 4 }]} keyboardShouldPersistTaps="handled">
        <Text style={ui.section}>HOW LONG TO SAVE?</Text>
        <View style={ui.card}>
          <View style={styles.row}>
            <Input label="Target (₱)" value={save.target} onChange={v => setSave({ ...save, target: v })} />
            <Input label="Each month (₱)" value={save.monthly} onChange={v => setSave({ ...save, monthly: v })} />
          </View>
          {num(save.target) > 0 && <Text style={styles.result}>{result(monthsToPayoff(num(save.target), num(save.monthly)), 'reaches the target')}</Text>}
        </View>

        <Text style={ui.section}>LOAN PAYOFF</Text>
        <View style={ui.card}>
          <View style={styles.row}>
            <Input label="Owed (₱)" value={loan.owed} onChange={v => setLoan({ ...loan, owed: v })} />
            <Input label="Pay / month (₱)" value={loan.payment} onChange={v => setLoan({ ...loan, payment: v })} />
          </View>
          <Input label="Interest % / year" value={loan.rate} onChange={v => setLoan({ ...loan, rate: v })} />
          {num(loan.owed) > 0 && <Text style={styles.result}>{result(monthsToPayoff(num(loan.owed), num(loan.payment), num(loan.rate)), 'gets paid off')}</Text>}
        </View>

        <Text style={ui.section}>MORE</Text>
        {([
          ['trending-down-outline', 'Debt payoff planner', '/debt'],
          ['notifications-outline', 'Payday reminders', '/settings'],
          ['cloud-upload-outline', 'Cloud backup', '/settings'],
        ] as const).map(([icon, label, href]) => (
          <TouchableOpacity key={label} style={[ui.card, styles.link]} onPress={() => router.push(href)} accessibilityRole="button">
            <Ionicons name={icon} size={20} color={Colors.primary} />
            <Text style={styles.linkText}>{label}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flex: 1, marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={v => onChange(formatAmountInput(v))} keyboardType="decimal-pad" placeholder="0"
        placeholderTextColor={Colors.textMuted} accessibilityLabel={label} />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.offWhite, borderRadius: 12, paddingHorizontal: 12, minHeight: 46,
    fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
  },
  result: { fontSize: 16, fontWeight: '800', color: Colors.primary, marginTop: 4 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  linkText: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
}));
