/**
 * Paws — calculator keypad for amounts: digits, ., ⌫, + − × ÷, =. Works on the raw expression string;
 * display it with formatExpression() and evaluate with evaluate() (lib/amount.ts).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/Colors';
import { pressKey } from '../lib/amount';
import { themed } from './theme';

const ROWS = [['7', '8', '9', '÷'], ['4', '5', '6', '×'], ['1', '2', '3', '−'], ['.', '0', '⌫', '+']];
const OPS = '+−×÷';

export function AmountKeypad({ value, onChange, onDone }: { value: string; onChange: (v: string) => void; onDone: () => void }) {
  return (
    <View style={styles.pad}>
      {ROWS.map(row => (
        <View key={row.join()} style={styles.row}>
          {row.map(k => (
            <TouchableOpacity
              key={k}
              style={[styles.key, OPS.includes(k) && styles.op]}
              onPress={() => onChange(pressKey(value, k))}
              onLongPress={k === '⌫' ? () => onChange('') : undefined}
              accessibilityRole="button"
              accessibilityLabel={k === '⌫' ? 'Delete' : k === '÷' ? 'Divide' : k === '×' ? 'Times' : k === '−' ? 'Minus' : k === '+' ? 'Plus' : k}
            >
              {k === '⌫' ? <Ionicons name="backspace-outline" size={24} color={Colors.textPrimary} />
                : <Text style={[styles.keyText, OPS.includes(k) && styles.opText]}>{k}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <View style={styles.row}>
        <TouchableOpacity style={styles.key} onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel="Clear">
          <Text style={styles.keyText}>C</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.key, styles.op]} onPress={() => onChange(pressKey(value, '='))} accessibilityRole="button" accessibilityLabel="Equals">
          <Text style={[styles.keyText, styles.opText]}>=</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.key, styles.done]} onPress={() => { onChange(pressKey(value, '=')); onDone(); }} accessibilityRole="button">
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  pad: { gap: 8, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8 },
  key: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  keyText: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  op: { backgroundColor: Colors.primaryBg },
  opText: { color: Colors.primary, fontWeight: '800' },
  done: { flex: 2, backgroundColor: Colors.primary, borderColor: Colors.primary },
  doneText: { fontSize: 17, fontWeight: '800', color: Colors.onPrimary },
}));
