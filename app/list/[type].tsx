/**
 * Paws — one list screen for Plan → Personal goals / Money owed to you / Planned payments / Travel.
 * Fields come from PLAN_LISTS (lib/planMath.ts); tap a card to edit, "+" to add.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { themed } from '../../components/theme';
import { EmptyState, Fab, ui } from '../../components/ui';
import Colors from '../../constants/Colors';
import { formatAmountInput } from '../../lib/amount';
import { useDb } from '../../lib/db/DbContext';
import { getActiveProfile, getTransactionsByDateRange } from '../../lib/db/queries';
import { cleanItem, isPlanList, nextDue, PLAN_LISTS, tagTotals, type Field, type PlanItem, type PlanListKey } from '../../lib/planMath';
import { usePlanList } from '../../lib/planStore';
import { localISO } from '../../lib/paydayDates';

const peso = (n: unknown) => `₱${Math.round(Number(n) || 0).toLocaleString('en-PH')}`;
const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const META: Record<PlanListKey, { title: string; icon: keyof typeof Ionicons.glyphMap; empty: string; add: string }> = {
  goals: { title: 'Personal Goals', icon: 'trophy-outline', empty: 'Saving for a laptop, a trip, an emergency fund?\nAdd a goal and track it here.', add: 'Goal' },
  owed: { title: 'Money Owed to You', icon: 'people-outline', empty: 'Lent someone money?\nKeep track so it doesn’t slip.', add: 'Debt' },
  planned: { title: 'Planned Payments', icon: 'calendar-outline', empty: 'Rent, bills, subscriptions…\nAdd them to see what’s due.', add: 'Payment' },
  trips: { title: 'Travel', icon: 'airplane-outline', empty: 'Plan a trip budget, then tag its expenses\n(e.g. #boracay in the note) to track spend.', add: 'Trip' },
};

export default function PlanListScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const list: PlanListKey = isPlanList(type ?? '') ? (type as PlanListKey) : 'goals';
  const meta = META[list];
  const { items, save, remove } = usePlanList(list);
  const [editing, setEditing] = useState<PlanItem | 'new' | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [tagSpend, setTagSpend] = useState(new Map<string, { spent: number; count: number }>());
  const db = useDb();

  // trips: spend per tag over the last year
  useFocusEffect(useCallback(() => {
    if (list !== 'trips') return;
    (async () => {
      const p = await getActiveProfile(db);
      if (!p) return;
      const today = localISO();
      const from = localISO(new Date(Date.now() - 365 * 864e5));
      setTagSpend(tagTotals(await getTransactionsByDateRange(db, p.id, from, today)));
    })();
  }, [db, list]));

  const open = (item: PlanItem | 'new') => {
    setEditing(item);
    setForm(item === 'new' ? {} : Object.fromEntries(Object.entries(item).map(([k, v]) => [k, typeof v === 'boolean' ? v : v == null ? '' : typeof v === 'number' && k !== 'day' ? formatAmountInput(String(v)) : String(v)])));
  };

  const submit = async () => {
    const id = editing && editing !== 'new' ? editing.id : `${Date.now()}`;
    const result = cleanItem(list, form, id);
    if (typeof result === 'string') { Alert.alert('Check this field', result); return; }
    await save(result);
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!editing || editing === 'new') return;
    Alert.alert('Delete?', `Remove “${editing.name ?? editing.person}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await remove(editing.id); setEditing(null); } },
    ]);
  };

  if (editing) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Stack.Screen options={{ title: editing === 'new' ? `New ${meta.add.toLowerCase()}` : `Edit ${meta.add.toLowerCase()}` }} />
        <ScrollView style={ui.screen} contentContainerStyle={[ui.scroll, { paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
          {(PLAN_LISTS[list] as Field[]).map(f => (
            <View key={f.key} style={styles.field}>
              {f.kind === 'toggle' ? (
                <View style={styles.toggleRow}>
                  <Text style={styles.label}>{f.label}</Text>
                  <Switch value={form[f.key] === true} onValueChange={v => setForm(prev => ({ ...prev, [f.key]: v }))} accessibilityLabel={f.label} />
                </View>
              ) : (
                <>
                  <Text style={styles.label}>{f.label}{f.required ? ' *' : ''}</Text>
                  <TextInput
                    style={styles.input}
                    value={String(form[f.key] ?? '')}
                    onChangeText={v => setForm(prev => ({ ...prev, [f.key]: f.kind === 'number' ? formatAmountInput(v) : v }))}
                    keyboardType={f.kind === 'number' ? 'decimal-pad' : f.kind === 'day' ? 'number-pad' : 'default'}
                    autoCapitalize={f.kind === 'tag' || f.kind === 'date' ? 'none' : 'sentences'}
                    placeholderTextColor={Colors.textMuted}
                    accessibilityLabel={f.label}
                  />
                </>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.save} onPress={submit} accessibilityRole="button">
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
          {editing !== 'new' && (
            <TouchableOpacity style={styles.delete} onPress={confirmDelete} accessibilityRole="button">
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setEditing(null)} accessibilityRole="button">
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={ui.screen}>
      <Stack.Screen options={{ title: meta.title }} />
      <ScrollView contentContainerStyle={[ui.scroll, { paddingTop: 4 }]}>
        <Summary list={list} items={items} />
        {items.length === 0 && <EmptyState icon={meta.icon} text={meta.empty} />}
        {items.map(it => {
          const row = describe(list, it, tagSpend);
          return (
            <TouchableOpacity key={it.id} style={ui.card} onPress={() => open(it)} accessibilityRole="button" activeOpacity={0.85}>
              <View style={styles.rowHead}>
                <Text style={[styles.title, it.settled === true && styles.done]} numberOfLines={1}>{row.title}</Text>
                <Text style={styles.value}>{row.value}</Text>
              </View>
              <Text style={[styles.sub, row.warn && { color: Colors.expense }]}>{row.sub}</Text>
              {row.progress != null && (
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.min(100, row.progress * 100)}%`, backgroundColor: row.progress > 1 ? Colors.expense : Colors.primary }]} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Fab label={meta.add} onPress={() => open('new')} />
    </View>
  );
}

function describe(list: PlanListKey, it: PlanItem, tagSpend: Map<string, { spent: number }>) {
  switch (list) {
    case 'goals': {
      const saved = Number(it.saved) || 0, target = Number(it.target) || 0;
      return { title: String(it.name), value: peso(target), sub: `${peso(saved)} saved · ${peso(Math.max(0, target - saved))} to go`, progress: target ? saved / target : 0, warn: false };
    }
    case 'owed':
      return {
        title: String(it.person), value: peso(it.amount), progress: null,
        sub: it.settled ? 'Paid back ✓' : [it.note, it.due && `due ${it.due}`].filter(Boolean).join(' · ') || 'Not paid yet',
        warn: !it.settled && !!it.due && String(it.due) < localISO(),
      };
    case 'planned': {
      const due = nextDue(Number(it.day));
      const days = Math.round((due.getTime() - new Date(new Date().toDateString()).getTime()) / 864e5);
      return { title: String(it.name), value: peso(it.amount), sub: `Every month on the ${it.day} · next ${shortDate(due)}${days === 0 ? ' (today)' : ` (in ${days} days)`}`, progress: null, warn: days <= 2 };
    }
    case 'trips': {
      const spent = tagSpend.get(String(it.tag))?.spent ?? 0, budget = Number(it.budget) || 0;
      const dates = [it.start, it.end].filter(Boolean).join(' → ');
      return { title: String(it.name), value: peso(budget), sub: `${peso(spent)} spent on #${it.tag}${dates ? ` · ${dates}` : ''}`, progress: budget ? spent / budget : 0, warn: spent > budget };
    }
  }
}

function Summary({ list, items }: { list: PlanListKey; items: PlanItem[] }) {
  const sum = (k: string, f: (i: PlanItem) => boolean = () => true) => items.filter(f).reduce((s, i) => s + (Number(i[k]) || 0), 0);
  const line = {
    goals: `${peso(sum('saved'))} saved of ${peso(sum('target'))}`,
    owed: `${peso(sum('amount', i => !i.settled))} still owed to you`,
    planned: `${peso(sum('amount'))} in planned payments each month`,
    trips: `${peso(sum('budget'))} budgeted across ${items.length} trip${items.length === 1 ? '' : 's'}`,
  }[list];
  return items.length ? <View style={ui.tintCard}><Text style={styles.summary}>{line}</Text></View> : null;
}

const styles = themed(() => StyleSheet.create({
  field: { marginTop: 14 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, minHeight: 48,
    fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
  },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48 },
  save: { marginTop: 24, minHeight: 52, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '800' },
  delete: { marginTop: 12, minHeight: 52, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.expense, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: Colors.expense, fontSize: 16, fontWeight: '800' },
  cancel: { color: Colors.textSecondary, fontSize: 15, fontWeight: '700', textAlign: 'center', paddingVertical: 14 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  done: { textDecorationLine: 'line-through', color: Colors.textMuted },
  value: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  track: { height: 8, borderRadius: 4, backgroundColor: Colors.border, overflow: 'hidden', marginTop: 10 },
  fill: { height: '100%', borderRadius: 4 },
  summary: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
}));
