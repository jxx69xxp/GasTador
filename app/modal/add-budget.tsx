/**
 * GasTador — Add / Edit Budget Modal
 * Set a monthly spend limit for an expense category
 */

import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
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
import { getActiveProfile, getCategories, upsertBudget } from '../../lib/db/queries';
import type { Category } from '../../lib/types';

const NOW = new Date();

export default function AddBudgetModal() {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const p = await getActiveProfile(db);
    if (!p) return;
    const cats = await getCategories(db, p.id, 'expense');
    setCategories(cats);
    if (cats.length > 0) setSelectedCategory(cats[0].id);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const handleSave = useCallback(async () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a budget amount greater than 0.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('No Category', 'Please select a category.');
      return;
    }
    setSaving(true);
    try {
      const p = await getActiveProfile(db);
      if (!p) return;
      await upsertBudget(db, p.id, selectedCategory, amt, NOW.getFullYear(), NOW.getMonth() + 1);
      router.back();
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setSaving(false);
    }
  }, [db, selectedCategory, amount]);

  const monthName = NOW.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.monthNote}>Setting budget for {monthName}</Text>

        {/* Category */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {categories.map(cat => (
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

        {/* Amount */}
        <Text style={styles.label}>Monthly Limit (₱)</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="e.g. 5000"
          keyboardType="decimal-pad"
          placeholderTextColor={Colors.textMuted}
          autoFocus
        />

        <Text style={styles.hint}>
          💡 Long-press any budget card on the Budgets tab to remove it.
        </Text>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnLabel}>{saving ? 'Saving…' : 'Set Budget'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.screenBg },
  scroll: { padding: 20 },
  monthNote: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 20, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.border,
  },
  chipLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 16,
    lineHeight: 20,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnLabel: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
