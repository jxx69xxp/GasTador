/**
 * Paws — shared screen building blocks (header, cat tip, cards, pill FAB)
 * so Home, Accounts, Log, Budgets and the add sheets all look like one app.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, ImageStyle, StyleProp, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { themed } from './theme';

/** Opaque mix of `hex` over `base` (e.g. a 12% account-color tint on the card surface).
 *  Android draws elevation shadows *through* translucent backgrounds, so tints on shadowed cards must be opaque. */
export function mix(hex: string, base: string, amount: number) {
  const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map(i => Math.round(p(hex, i) * amount + p(base, i) * (1 - amount)));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

export const shadow = {
  shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
};

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

/** Paws the cat, gently bobbing and tilting (still when Reduce Motion is on). */
export function AnimatedCat({ style }: { style?: StyleProp<ImageStyle> }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      loop.start();
    }).catch(() => {});
    return () => loop?.stop();
  }, [t]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] });
  return (
    <Animated.Image
      source={require('../assets/splash-icon.png')}
      style={[style, { transform: [{ translateY }, { rotate }] }]}
      accessibilityIgnoresInvertColors
      accessible={false}
    />
  );
}

/** Paws the cat with a speech bubble. */
export function CatTip({ text }: { text: string }) {
  return (
    <View style={styles.catCard}>
      <AnimatedCat style={styles.catImg} />
      <View style={styles.bubble}>
        <Text style={styles.bubbleName}>Paws</Text>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
    </View>
  );
}

export function PillButton({ icon, label, onPress, solid }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; solid?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.pill, solid && styles.pillSolid]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={solid ? Colors.onPrimary : Colors.textSecondary} />
      <Text style={[styles.pillText, solid && { color: Colors.onPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Floating "+ Label" button, bottom-right. */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Add ${label.toLowerCase()}`}>
      <Ionicons name="add" size={22} color={Colors.onPrimary} />
      <Text style={styles.fabLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={Colors.primaryLight} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export const ui = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.screenBg },
  scroll: { paddingHorizontal: 18, paddingBottom: 110 },
  card: { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, marginTop: 14, ...shadow },
  tintCard: {
    backgroundColor: Colors.primaryBg, borderRadius: 18, padding: 16, marginTop: 14,
    borderWidth: 1, borderColor: Colors.primaryLight + '40',
  },
  label: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.8 },
  section: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.6, marginTop: 22, marginBottom: 2 },
}));

const styles = themed(() => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 4, backgroundColor: Colors.screenBg },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },

  catCard: {
    flexDirection: 'row', alignItems: 'flex-end', marginTop: 14, paddingTop: 12, paddingHorizontal: 12,
    borderRadius: 20, backgroundColor: Colors.primaryBg,
  },
  catImg: { width: 84, height: 84, marginBottom: -4 },
  bubble: {
    flex: 1, marginLeft: 8, marginBottom: 14, padding: 12, borderRadius: 16, borderBottomLeftRadius: 4,
    backgroundColor: Colors.surface, ...shadow,
  },
  bubbleName: { fontSize: 13, fontWeight: '800', color: Colors.primary, marginBottom: 2 },
  bubbleText: { fontSize: 14, lineHeight: 20, color: Colors.textPrimary },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 22,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  pillSolid: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },

  fab: {
    position: 'absolute', bottom: 18, right: 18, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, height: 52, borderRadius: 26, backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabLabel: { color: Colors.onPrimary, fontSize: 16, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
}));
