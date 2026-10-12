/**
 * Paws — Add Transaction sheet
 * Big amount, Expense / Income / Transfer switch, note, category and account chips, date.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useDb } from '../../lib/db/DbContext';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Keyboard,
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { AmountKeypad } from '../../components/AmountKeypad';
import { currentScheme } from '../../constants/Colors';
import { shadow } from '../../components/ui';
import { evaluate, formatExpression, hasOperator } from '../../lib/amount';
import Colors from '../../constants/Colors';
import { getAccounts, getActiveProfile, getBudgets, getCategories, deleteTransaction, postTransaction } from '../../lib/db/queries';
import { notifyBudget } from '../../lib/notifications';
import type { Account, Category, TransactionType } from '../../lib/types';
import { themed } from '../../components/theme';
import { localISO } from '../../lib/paydayDates';
import { CategoryIcon } from '../../components/CategoryIcon';
import { AccountIcon } from '../../components/AccountIcon';


// a function so the colors follow the active theme
const prettyDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  const today = localISO();
  return iso === today ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const typeOptions = (): { id: TransactionType; label: string; color: string }[] => [
  { id: 'expense', label: 'Expense', color: Colors.expense },
  { id: 'income', label: 'Income', color: Colors.income },
  { id: 'transfer', label: 'Transfer', color: Colors.transfer },
];

export default function AddTransactionModal() {
  const db = useDb();
  const params = useLocalSearchParams<{ type?: string; amount?: string; memo?: string; category?: string; date?: string; edit?: string; account?: string; to?: string }>();
  const editId = Number(params.edit) || null; // set by swipe/tap Edit on a transaction
  const [type, setType] = useState<TransactionType>(
    params.type === 'income' || params.type === 'transfer' ? params.type : 'expense');
  const [amount, setAmount] = useState(() => (Number(params.amount) > 0 ? String(params.amount) : ''));          // raw calculator expression, e.g. "1200+300"
  const [pickDate, setPickDate] = useState(false);
  const [keypad, setKeypad] = useState(false); // opens only when the amount is tapped
  const [memo, setMemo] = useState(params.memo ?? '');
  const [date, setDate] = useState(() => (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && params.date <= localISO() ? params.date : localISO()));
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(Number(params.account) || null);
  const [selectedToAccount, setSelectedToAccount] = useState<number | null>(Number(params.to) || null);
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
    if (params.category) setSelectedCategory(cur => cur ?? cats.find(c => c.name === params.category)?.id ?? null);
    setSelectedAccount(cur => cur ?? accs[0]?.id ?? null);
    setSelectedToAccount(cur => cur ?? accs[1]?.id ?? null);
  }, [db]);

  // refocus reload: picks up a wallet added from the "No wallets yet" link
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filteredCategories = categories.filter(c =>
    type === 'income' ? c.type === 'income' : c.type === 'expense'
  );

  const handleSave = useCallback(async () => {
    const amt = evaluate(amount) ?? NaN;
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
      // edit = post the new entry first, then drop the old one, so a failure never loses the transaction
      await postTransaction(db, p.id, {
        account_id: selectedAccount,
        to_account_id: type === 'transfer' ? selectedToAccount : null,
        category_id: type !== 'transfer' ? selectedCategory : null,
        type,
        amount: amt,
        memo: memo.trim(),
        date,
      });
      if (editId) await deleteTransaction(db, editId);
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
  }, [db, editId, type, amount, memo, date, selectedAccount, selectedToAccount, selectedCategory]);

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
          <TouchableOpacity onPress={() => { Keyboard.dismiss(); setPickDate(false); setKeypad(true); }} accessibilityRole="button" accessibilityLabel={`Amount ${formatExpression(amount) || 'zero'} pesos. Opens calculator`}>
            <Text style={[styles.amount, !amount && { color: Colors.border }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatExpression(amount) || '0'}
            </Text>
          </TouchableOpacity>
        </View>
        {/* always rendered so the keypad doesn't jump under your finger when the result appears */}
        <Text style={styles.calcResult} accessibilityLiveRegion="polite">
          {hasOperator(amount) && evaluate(amount) != null ? `= ₱${(evaluate(amount) ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}` : ' '}
        </Text>
        {keypad && <AmountKeypad value={amount} onChange={setAmount} onDone={() => setKeypad(false)} />}

        {/* Note */}
        <View style={styles.noteBox}>
          <Ionicons name="document-text-outline" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.note}
            value={memo}
            onChangeText={setMemo}
            placeholder="Add a note…"
            onFocus={() => setKeypad(false)}
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
                      <CategoryIcon emoji={cat.icon} size={16} color={cat.color} />
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
        {accounts.length === 0 ? (
          <TouchableOpacity style={styles.noAccount} onPress={() => router.push('/modal/add-account')} accessibilityRole="button">
            <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
            <Text style={styles.noAccountText}>No wallets yet. Tap to add one first.</Text>
          </TouchableOpacity>
        ) : <AccountChips accounts={accounts} selected={selectedAccount} onSelect={setSelectedAccount} />}
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
        <TouchableOpacity
          style={styles.noteBox}
          onPress={() => { setKeypad(false); setPickDate(v => !v); }}
          accessibilityRole="button"
          accessibilityLabel={`Date ${prettyDate(date)}. Change date`}
        >
          <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />
          <Text style={[styles.note, { paddingVertical: 14 }]}>{prettyDate(date)}</Text>
          <Ionicons name={pickDate ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        {pickDate && (
          <DateTimePicker
            value={new Date(`${date}T12:00:00`)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={new Date()}
            themeVariant={currentScheme()}
            onChange={(e, d) => {
              if (Platform.OS === 'android') setPickDate(false); // Android shows a dialog that closes itself
              if (e.type === 'set' && d) setDate(localISO(d));
            }}
          />
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{type === 'transfer' ? 'FROM' : 'ACCOUNT'}</Text>
          <Text style={styles.accountName} numberOfLines={1}>
            {fromAccount ? fromAccount.name : 'Pick an account'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: active.color }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
        >
          <Text style={styles.saveLabel}>{saving ? 'Saving…' : `${editId ? 'Update' : 'Save'} ${active.label}`}</Text>
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
              <AccountIcon name={acc.name} icon={acc.icon} size={16} box={30} color={acc.color} />
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
  segItem: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segLabel: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },

  scroll: { paddingHorizontal: 18, paddingBottom: 24 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 18 },
  calcResult: { textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.textSecondary, marginTop: -10, marginBottom: 8 },
  currency: { fontSize: 28, fontWeight: '700', color: Colors.textMuted, marginRight: 6 },
  amount: { fontSize: 56, fontWeight: '800', color: Colors.textPrimary, minWidth: 80, textAlign: 'center' },

  noteBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 16,
    paddingHorizontal: 14, minHeight: 52, ...shadow,
  },
  note: { flex: 1, fontSize: 16, color: Colors.textPrimary, paddingVertical: 12 },

  label: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },
  noAccount: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.primary },
  noAccountText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
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
