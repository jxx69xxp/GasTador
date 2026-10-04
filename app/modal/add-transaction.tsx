/**
 * GasTador — Add Transaction Modal
 * Handles income, expense, and transfer
 */

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
import Colors from '../../constants/Colors';
import { getAccounts, getActiveProfile, getBudgets, getCategories, postTransaction } from '../../lib/db/queries';
import { notifyBudget } from '../../lib/notifications';
import type { Account, Category, TransactionType } from '../../lib/types';

const TODAY = new Date().toISOString().slice(0, 10);

const TYPE_OPTIONS: { id: TransactionType; label: string; color: string }[] = [
  { id: 'expense', label: '🔴 Expense', color: Colors.expense },
  { id: 'income', label: '🟢 Income', color: Colors.income },
  { id: 'transfer', label: '🔵 Transfer', color: Colors.transfer },
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

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Type Picker */}
        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.typeChip, type === opt.id && { backgroundColor: opt.color }]}
              onPress={() => { setType(opt.id); setSelectedCategory(null); }}
            >
              <Text style={[styles.typeLabel, type === opt.id && { color: Colors.white }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <Text style={styles.label}>Amount (₱)</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          placeholderTextColor={Colors.textMuted}
        />

        {/* Date */}
        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textMuted}
        />

        {/* Source Account */}
        <Text style={styles.label}>{type === 'transfer' ? 'From Account' : 'Account'}</Text>
        <View style={styles.chipRow}>
          {accounts.map(acc => (
            <TouchableOpacity
              key={acc.id}
              style={[styles.chip, selectedAccount === acc.id && { backgroundColor: acc.color }]}
              onPress={() => setSelectedAccount(acc.id)}
            >
              <Text style={[styles.chipLabel, selectedAccount === acc.id && { color: Colors.white }]}>
                {acc.icon} {acc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* To Account (transfer only) */}
        {type === 'transfer' && (
          <>
            <Text style={styles.label}>To Account</Text>
            <View style={styles.chipRow}>
              {accounts.filter(a => a.id !== selectedAccount).map(acc => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.chip, selectedToAccount === acc.id && { backgroundColor: acc.color }]}
                  onPress={() => setSelectedToAccount(acc.id)}
                >
                  <Text style={[styles.chipLabel, selectedToAccount === acc.id && { color: Colors.white }]}>
                    {acc.icon} {acc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Category (non-transfer) */}
        {type !== 'transfer' && (
          <>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipRow}>
              {filteredCategories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, selectedCategory === cat.id && { backgroundColor: cat.color }]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={[styles.chipLabel, selectedCategory === cat.id && { color: Colors.white }]}>
                    {cat.icon} {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Memo */}
        <Text style={styles.label}>Memo (optional)</Text>
        <TextInput
          style={[styles.input, styles.inputMemo]}
          value={memo}
          onChangeText={setMemo}
          placeholder="e.g. Starbucks latte, Salary March"
          placeholderTextColor={Colors.textMuted}
          multiline
        />

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnLabel}>{saving ? 'Saving…' : 'Save Transaction'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.screenBg },
  scroll: { padding: 20 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 16, marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.border,
  },
  typeLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputMemo: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.border,
  },
  chipLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnLabel: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
