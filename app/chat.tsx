/**
 * Paws — Ask Paws: chat about your own data. Answers are computed on the phone (lib/chat.ts),
 * nothing is sent anywhere.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themed } from '../components/theme';
import { AnimatedCat, ui } from '../components/ui';
import Colors from '../constants/Colors';
import { answer, followUps, parseCommand, SUGGESTIONS, type ChatCtx, type Draft } from '../lib/chat';
import { useDb } from '../lib/db/DbContext';
import { getAccounts, getActiveProfile, getBudgets, getCategories, getTransactionsByDateRange, postTransaction } from '../lib/db/queries';
import type { Account, Category } from '../lib/types';
import { router } from 'expo-router';
import { loadPlanList } from '../lib/planStore';
import { localISO } from '../lib/paydayDates';

type Msg = { id: string; from: 'me' | 'paws'; text: string; draft?: Draft; status?: 'saved' | 'cancelled' };

export default function ChatScreen() {
  const db = useDb();
  const insets = useSafeAreaInsets();
  const [ctx, setCtx] = useState<ChatCtx | null>(null);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Account[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: '0', from: 'paws', text: 'Hi! Ask me about your money, or tell me what you spent, like “spent 250 on food”, and I’ll log it. Everything stays on your phone.' },
  ]);
  const list = useRef<FlatList<Msg>>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      const p = await getActiveProfile(db);
      if (!p) return;
      const now = new Date();
      const from = localISO(new Date(now.getFullYear() - 1, now.getMonth(), 1));
      const [txns, accounts, budgets, goals, owed, categories] = await Promise.all([
        getTransactionsByDateRange(db, p.id, from, localISO(now)),
        getAccounts(db, p.id), getBudgets(db, p.id, now.getFullYear(), now.getMonth() + 1),
        loadPlanList('goals'), loadPlanList('owed'), getCategories(db, p.id),
      ]);
      setCtx({ now, txns, accounts, budgets, goals, owed });
      setCats(categories);
      setWallets(accounts.filter(a => a.type !== 'loan' && a.type !== 'credit_card'));
    })();
  }, [db]));

  const send = (text: string) => {
    const q = text.trim();
    if (!q || !ctx) return;
    const t = Date.now();
    setMsgs(m => [...m, { id: `${t}q`, from: 'me', text: q }]);
    setInput('');
    setChips([]);
    setTyping(true);
    // short "thinking" beat so replies feel conversational; answers are instant on-device
    setTimeout(() => {
      const draft = parseCommand(q, cats);
      const reply: Msg = draft
        ? { id: `${t}a`, from: 'paws', draft, text: wallets.length
            ? `Log this ${draft.type}?`
            : 'Add a wallet first (Wallet → Add), then I can log this for you.' }
        : { id: `${t}a`, from: 'paws', text: answer(q, ctx) };
      setTyping(false);
      setMsgs(m => [...m, reply]);
      setChips(draft ? [] : followUps(q));
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
    }, 450);
    setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
  };

  const resolve = (id: string, status: 'saved' | 'cancelled') =>
    setMsgs(m => m.map(x => (x.id === id ? { ...x, status } : x)));

  const saveDraft = async (msg: Msg) => {
    const d = msg.draft!;
    const p = await getActiveProfile(db);
    if (!p || !wallets[0]) return;
    const category = cats.find(c => c.name === d.category && c.type === d.type);
    await postTransaction(db, p.id, {
      account_id: wallets[0].id, category_id: category?.id ?? null, type: d.type,
      amount: d.amount, memo: d.memo, date: localISO(),
    });
    resolve(msg.id, 'saved');
    setChips(['How much did I spend today?', 'What’s my balance?']);
  };

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={list}
        style={{ flex: 1 }}
        data={msgs}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => item.from === 'me' ? (
          <View style={[styles.bubble, styles.me]}><Text style={styles.meText}>{item.text}</Text></View>
        ) : (
          <View style={styles.pawsRow}>
            <AnimatedCat style={styles.avatar} />
            <View style={[styles.bubble, styles.paws]}>
              <Text style={styles.pawsText}>{item.text}</Text>
              {item.draft && wallets.length > 0 && (
                <View style={styles.draft}>
                  <Text style={[styles.draftAmount, { color: item.draft.type === 'income' ? Colors.income : Colors.expense }]}>
                    {item.draft.type === 'income' ? '+' : '−'}₱{item.draft.amount.toLocaleString('en-PH')}
                  </Text>
                  <Text style={styles.draftMeta}>
                    {item.draft.category ?? 'No category'} · {wallets[0].name} · Today{item.draft.memo ? ` · “${item.draft.memo}”` : ''}
                  </Text>
                  {item.status ? (
                    <Text style={styles.draftDone}>{item.status === 'saved' ? '✓ Saved' : 'Cancelled'}</Text>
                  ) : (
                    <View style={styles.draftRow}>
                      <TouchableOpacity style={[styles.dBtn, styles.dSave]} onPress={() => saveDraft(item)} accessibilityRole="button">
                        <Text style={styles.dSaveText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dBtn}
                        onPress={() => { resolve(item.id, 'cancelled'); router.push({ pathname: '/modal/add-transaction', params: { type: item.draft!.type, amount: String(item.draft!.amount), memo: item.draft!.memo, category: item.draft!.category ?? '' } }); }}
                        accessibilityRole="button"
                      >
                        <Text style={styles.dText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.dBtn} onPress={() => resolve(item.id, 'cancelled')} accessibilityRole="button">
                        <Text style={styles.dText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
        accessibilityLiveRegion="polite"
        ListFooterComponent={typing ? (
          <View style={styles.pawsRow} accessibilityLabel="Paws is typing">
            <AnimatedCat style={styles.avatar} />
            <View style={[styles.bubble, styles.paws]}><Text style={styles.typing}>• • •</Text></View>
          </View>
        ) : null}
      />
      {chips.length > 0 && (
        <View style={styles.chips}>
          {chips.map(t => (
            <TouchableOpacity key={t} style={styles.chip} onPress={() => send(t)} accessibilityRole="button">
              <Text style={styles.chipText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {msgs.length === 1 && (
        <View style={styles.chips}>
          {SUGGESTIONS.map(t => (
            <TouchableOpacity key={t} style={styles.chip} onPress={() => send(t)} accessibilityRole="button">
              <Text style={styles.chipText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask Paws…"
          placeholderTextColor={Colors.textMuted}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          accessibilityLabel="Message to Paws"
        />
        <TouchableOpacity style={styles.send} onPress={() => send(input)} disabled={!input.trim()} accessibilityRole="button" accessibilityLabel="Send">
          <Ionicons name="arrow-up" size={22} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => StyleSheet.create({
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  me: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  meText: { color: Colors.onPrimary, fontSize: 15, lineHeight: 21 },
  pawsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatar: { width: 36, height: 36 },
  paws: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  pawsText: { color: Colors.textPrimary, fontSize: 15, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, paddingVertical: 8 },
  chip: { paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 20, backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primaryLight + '40' },
  chipText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 8, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, minHeight: 46, borderRadius: 23, paddingHorizontal: 16, fontSize: 16, color: Colors.textPrimary, backgroundColor: Colors.offWhite, borderWidth: 1, borderColor: Colors.border },
  typing: { color: Colors.textMuted, fontSize: 18, letterSpacing: 2 },
  draft: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, gap: 4 },
  draftAmount: { fontSize: 22, fontWeight: '800' },
  draftMeta: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  draftDone: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, marginTop: 6 },
  draftRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dBtn: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  dSave: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dSaveText: { color: Colors.onPrimary, fontWeight: '800', fontSize: 15 },
  dText: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
}));
