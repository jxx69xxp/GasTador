/**
 * Paws — Add Transaction sheet
 * Big amount, Expense / Income / Transfer switch, note, category and account chips, date.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useDb } from '../../lib/db/DbContext';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadow } from '../../components/ui';
import Colors from '../../constants/Colors';
import { getAccounts, getActiveProfile, getBudgets, getCategories, postTransaction } from '../../lib/db/queries';
import { notifyBudget } from '../../lib/notifications';
import type { Account, Category, TransactionType } from '../../lib/types';
import { themed } from '../../components/theme';

const TODAY = new Date().toISOString().slice(0, 10);

// a function so the colors follow the active theme
const typeOptions = (): { id: TransactionType; label: string; color: string }[] => [
  { id: 'expense', label: 'Expense', color: Colors.expense },
  { id: 'income', label: 'Income', color: Colors.income },
  { id: 'transfer', label: 'Transfer', color: Colors.transfer },
];

export default function AddTransactionModal() {
  const db = useDb();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(TODAY);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [selectedToAccount, setSelectedToAccount] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    const p = await getActiveProfile(db);
    if (!p) return;
    const [accs, cats] = await Promise.all([
      getAccounts(db, p.id),
      getCategories(db, p.id),
    ]);
    setAccounts(accs);
    setCategories(cats);
    if (accs.length > 0) setSelectedAccount(accs[0].id);
    if (accs.length > 1) setSelectedToAccount(accs[1].id);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const filteredCategories = categories.filter(c =>
    type === 'income' ? c.type === 'income' : c.type === 'expense'
  );

  const handleSave = useCallback(async () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
      Alert.alert('Invalid Date', 'Use the format YYYY-MM-DD, e.g. 2026-10-04.');
      return;
    }
    if (!selectedAccount) {
      Alert.alert('No Account', 'Please select an account.');
      return;
    }
    if (type === 'transfer' && !selectedToAccount) {
      Alert.alert('No Destination', 'Please select a destination account.');
      return;
    }
    if (type === 'transfer' && selectedAccount === selectedToAccount) {
      Alert.alert('Same Account', 'Source and destination accounts must be different.');
      return;
    }

    setSaving(true);
    try {
      const p = await getActiveProfile(db);
      if (!p) return;
      await postTransaction(db, p.id, {
        account_id: selectedAccount,
        to_account_id: type === 'transfer' ? selectedToAccount : null,
        category_id: type !== 'transfer' ? selectedCategory : null,
        type,
        amount: amt,
        memo: memo.trim(),
        date,
      });
      if (type === 'expense' && selectedCategory) {
        const [y, m] = date.split('-').map(Number);
        const b = (await getBudgets(db, p.id, y, m)).find(b => b.category_id === selectedCategory);
        if (b) notifyBudget(b.category_name ?? 'Budget', b.spent ?? 0, b.amount, amt).catch(() => {});
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setSaving(false);
    }
  }, [db, type, amount, memo, date, selectedAccount, selectedToAccount, selectedCategory]);

  const TYPE_OPTIONS = typeOptions();
  const active = TYPE_OPTIONS.find(o => o.id === type)!;
  const fromAccount = accounts.find(a => a.id === selectedAccount);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Top bar: close + type switch */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.close} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.segment} accessibilityRole="tablist">
          {TYPE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.segItem, type === opt.id && { backgroundColor: opt.color }]}
              onPress={() => { setType(opt.id); setSelectedCategory(null); }}
              accessibilityRole="tab"
              accessibilityState={{ selected: type === opt.id }}
            >
              <Text style={[styles.segLabel, type === opt.id && { color: Colors.onPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Amount */}
        <View style={styles.amountRow}>
          <Text style={styles.currency}>₱</Text>
          <TextInput
            style={styles.amount}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.border}
            accessibilityLabel="Amount in pesos"
            autoFocus
          />
        </View>

        {/* Note */}
        <View style={styles.noteBox}>
          <Ionicons name="document-text-outline" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.note}
            value={memo}
            onChangeText={setMemo}
            placeholder="Add a note…"
            placeholderTextColor={Colors.textMuted}
            accessibilityLabel="Note"
          />
        </View>

        {/* Category */}
        {type !== 'transfer' && (
          <>
            <Text style={styles.label}>CATEGORY</Text>
            <View style={styles.chipRow}>
              {filteredCategories.map(cat => {
                const on = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, on && { borderColor: cat.color, backgroundColor: cat.color + '1F' }]}
                    onPress={() => setSelectedCategory(on ? null : cat.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <View style={[styles.chipIcon, { backgroundColor: cat.color + '26' }]}>
                      <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                    </View>
                    <Text style={styles.chipLabel}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Account(s) */}
        <Text style={styles.label}>{type === 'transfer' ? 'FROM ACCOUNT' : 'ACCOUNT'}</Text>
        <AccountChips accounts={accounts} selected={selectedAccount} onSelect={setSelectedAccount} />
        {type === 'transfer' && (
          <>
            <Text style={styles.label}>TO ACCOUNT</Text>
            <AccountChips
              accounts={accounts.filter(a => a.id !== selectedAccount)}
              selected={selectedToAccount}
              onSelect={setSelectedToAccount}
            />
          </>
        )}

        {/* Date */}
        <Text style={styles.label}>LOGGED AT</Text>
        <View style={styles.noteBox}>
          <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.note}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
            accessibilityLabel="Date, format year month day"
          />
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{type === 'transfer' ? 'FROM' : 'ACCOUNT'}</Text>
          <Text style={styles.accountName} numberOfLines={1}>
            {fromAccount ? `${fromAccount.icon} ${fromAccount.name}` : 'Pick an account'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: active.color }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
        >
          <Text style={styles.saveLabel}>{saving ? 'Saving…' : `Save ${active.label}`}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function AccountChips({ accounts, selected, onSelect }: {
  accounts: Account[]; selected: number | null; onSelect: (id: number) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {accounts.map(acc => {
        const on = selected === acc.id;
        return (
          <TouchableOpacity
            key={acc.id}
            style={[styles.chip, on && { borderColor: acc.color, backgroundColor: acc.color + '1F' }]}
            onPress={() => onSelect(acc.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <View style={[styles.chipIcon, { backgroundColor: acc.color + '26' }]}>
              <Text style={{ fontSize: 14 }}>{acc.icon}</Text>
            </View>
            <Text style={styles.chipLabel}>{acc.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.screenBg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  segment: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: Colors.border },
  segItem: { minHeight: 38, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segLabel: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },

  scroll: { paddingHorizontal: 18, paddingBottom: 24 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 18 },
  currency: { fontSize: 28, fontWeight: '700', color: Colors.textMuted, marginRight: 6 },
  amount: { fontSize: 56, fontWeight: '800', color: Colors.textPrimary, minWidth: 80, textAlign: 'center' },

  noteBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 16,
    paddingHorizontal: 14, minHeight: 52, ...shadow,
  },
  note: { flex: 1, fontSize: 16, color: Colors.textPrimary, paddingVertical: 12 },

  label: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingLeft: 6, paddingRight: 12,
    borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  chipIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 4,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  accountName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: -6 },
  saveBtn: { minHeight: 52, paddingHorizontal: 22, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  saveLabel: { color: Colors.onPrimary, fontSize: 16, fontWeight: '800' },
}));
