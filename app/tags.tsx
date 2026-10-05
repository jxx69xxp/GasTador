/**
 * Paws — Tags: spend per #hashtag found in transaction notes (no extra data to manage).
 */
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { themed } from '../components/theme';
import { EmptyState, ui } from '../components/ui';
import Colors from '../constants/Colors';
import { useDb } from '../lib/db/DbContext';
import { getActiveProfile, getTransactionsByDateRange } from '../lib/db/queries';
import { tagTotals } from '../lib/planMath';
import { localISO } from '../lib/paydayDates';

export default function TagsScreen() {
  const db = useDb();
  const [rows, setRows] = useState<[string, { spent: number; count: number }][]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const p = await getActiveProfile(db);
      if (!p) return;
      const today = localISO();
      const from = localISO(new Date(Date.now() - 365 * 864e5));
      setRows([...tagTotals(await getTransactionsByDateRange(db, p.id, from, today))].sort((a, b) => b[1].spent - a[1].spent));
    })();
  }, [db]));

  return (
    <ScrollView style={ui.screen} contentContainerStyle={[ui.scroll, { paddingTop: 4 }]}>
      <View style={ui.tintCard}>
        <Text style={styles.hint}>Add tags to an expense note, like “Dinner #boracay #friends”. Totals cover the last 12 months.</Text>
      </View>
      {rows.length === 0 && <EmptyState icon="pricetags-outline" text="No tags yet." />}
      {rows.map(([tag, v]) => (
        <View key={tag} style={[ui.card, styles.row]}>
          <Text style={styles.tag}>#{tag}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.spent}>₱{Math.round(v.spent).toLocaleString('en-PH')}</Text>
            <Text style={styles.count}>{v.count} expense{v.count === 1 ? '' : 's'}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  hint: { fontSize: 14, lineHeight: 20, color: Colors.textPrimary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  spent: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  count: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
}));
