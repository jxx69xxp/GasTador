/**
 * Paws — Add / Edit Account sheet (edit when opened with ?id=)
 */

import { router, Stack, useLocalSearchParams } from 'expo-router';
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
import { formatAmountInput, parseAmount } from '../../lib/amount';
import { createAccount, deleteAccount, getAccounts, getActiveProfile, updateAccount } from '../../lib/db/queries';
import type { Account } from '../../lib/types';
import { themed } from '../../components/theme';
import { CategoryIcon } from '../../components/CategoryIcon';

const ACCOUNT_TYPES: { id: Account['type']; label: string; icon: string; color: string }[] = [
  { id: 'cash',        label: 'Cash',        icon: '💵', color: Colors.cash },
  { id: 'bank',        label: 'Bank',        icon: '🏦', color: Colors.bank },
  { id: 'credit_card', label: 'Credit Card', icon: '💳', color: Colors.credit_card },
  { id: 'loan',        label: 'Loan',        icon: '🏦', color: Colors.loan },
  { id: 'investment',  label: 'Investment',  icon: '📈', color: Colors.investment },
];

const PALETTE = [
  '#4CAF50', '#2196F3', '#9C27B0', '#FF5722', '#FF9800',
  '#E91E63', '#00BCD4', '#009688', '#3F51B5', '#795548',
];

export default function AddAccountModal() {
  const db = useDb();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id ? Number(id) : null;
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('cash');
  const [balance, setBalance] = useState('0');
  const [color, setColor] = useState(Colors.cash);
  const [icon, setIcon] = useState('💵');
  const [saving, setSaving] = useState(false);

  // edit mode: prefill from the stored account
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const p = await getActiveProfile(db);
      const acc = p && (await getAccounts(db, p.id)).find(a => a.id === editId);
      if (!acc) return;
      setName(acc.name); setType(acc.type); setBalance(formatAmountInput(String(acc.balance), true)); setColor(acc.color); setIcon(acc.icon);
    })();
  }, [db, editId]);

  const handleTypeSelect = (t: (typeof ACCOUNT_TYPES)[number]) => {
    setType(t.id);
    setColor(t.color);
    setIcon(t.icon);
  };

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter an account name.');
      return;
    }
    const bal = balance.trim() === '' ? 0 : parseAmount(balance);
    if (!Number.isFinite(bal)) {
      Alert.alert('Invalid Balance', 'Enter a number, e.g. 1500 or -250.50.');
      return;
    }
    setSaving(true);
    try {
      const data = { name: name.trim(), type, balance: bal, color, icon };
      if (editId) {
        await updateAccount(db, editId, data);
      } else {
        const p = await getActiveProfile(db);
        if (!p) return;
        await createAccount(db, p.id, data);
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setSaving(false);
    }
  }, [db, editId, name, type, balance, color, icon]);

  const handleDelete = () => {
    if (!editId) return;
    Alert.alert('Delete Account', `Delete "${name}"? All its transactions will also be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteAccount(db, editId); router.back(); } },
    ]);
  };

  const selectedType = ACCOUNT_TYPES.find(t => t.id === type)!;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: editId ? 'Edit Account' : 'Add Account' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Type */}
        <Text style={styles.label}>Account Type</Text>
        <View style={styles.typeGrid}>
          {ACCOUNT_TYPES.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.typeCard, type === t.id && { borderColor: t.color, borderWidth: 2 }]}
              onPress={() => handleTypeSelect(t)}
            >
              <CategoryIcon emoji={t.icon} size={26} color={t.color} />
              <Text style={[styles.typeLabel, type === t.id && { color: t.color }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Name */}
        <Text style={styles.label}>Account Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={`e.g. ${selectedType.label} account`}
          placeholderTextColor={Colors.textMuted}
          autoFocus={!editId}
        />

        {/* Opening Balance */}
        <Text style={styles.label}>{editId ? 'Current Balance (₱)' : 'Opening Balance (₱)'}</Text>
        <TextInput
          style={styles.input}
          value={balance}
          onChangeText={v => setBalance(formatAmountInput(v, true))}
          placeholder="0.00"
          keyboardType="decimal-pad"
          placeholderTextColor={Colors.textMuted}
        />

        {/* Color */}
        <Text style={styles.label}>Color</Text>
        <View style={styles.palette}>
          {PALETTE.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchSelected]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {/* Preview */}
        <View style={[styles.preview, { borderLeftColor: color }]}>
          <Text style={styles.previewIcon}>{icon}</Text>
          <View>
            <Text style={styles.previewName}>{name || 'Account Name'}</Text>
            <Text style={styles.previewType}>{selectedType.label}</Text>
          </View>
          <Text style={[styles.previewBalance, { color }]}>
            ₱{(parseAmount(balance) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnLabel}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Account'}</Text>
        </TouchableOpacity>

        {editId && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} accessibilityRole="button">
            <Text style={styles.deleteLabel}>Delete Account</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.screenBg },
  scroll: { padding: 20 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 20, marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minWidth: 90,
  },
  typeIcon: { fontSize: 22, marginBottom: 4 },
  typeLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  swatchSelected: {
    borderWidth: 3,
    borderColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  preview: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  previewIcon: { fontSize: 28 },
  previewName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  previewType: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  previewBalance: { fontSize: 16, fontWeight: '700', marginLeft: 'auto' },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  deleteBtn: {
    minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12,
    borderWidth: 1.5, borderColor: Colors.expense,
  },
  deleteLabel: { color: Colors.expense, fontSize: 16, fontWeight: '700' },
  saveBtnLabel: { color: Colors.onPrimary, fontSize: 16, fontWeight: '700' },
}));
