/**
 * Paws — shared screen building blocks (header, cat tip, cards, pill FAB)
 * so Home, Accounts, Log, Budgets and the add sheets all look like one app.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef } from 'react';
import { router, type Href } from 'expo-router';
import { scanReceipt } from '../lib/scan';
import { AccessibilityInfo, Alert, Animated, Easing, ImageStyle, Modal, Platform, Pressable, StyleProp, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
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

/** Desktop-width browser: sidebar nav + centered page instead of the phone layout. */
export function useWideWeb() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= 900;
}

/** Centered, readable content column for wide web screens. */
export const page = { width: '100%', maxWidth: 760, alignSelf: 'center' } as const;
export const SIDEBAR_WIDTH = 240;

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

const ADD_OPTIONS: { icon: keyof typeof Ionicons.glyphMap; label: string; href?: Href; color: () => string }[] = [
  { icon: 'chatbubbles-outline', label: 'Ask Paws', href: '/chat', color: () => Colors.primary },
  { icon: 'scan-outline', label: 'Scan receipt', color: () => Colors.textSecondary },
  { icon: 'swap-horizontal', label: 'Transfer', href: { pathname: '/modal/add-transaction', params: { type: 'transfer' } }, color: () => Colors.transfer },
  { icon: 'arrow-down-circle-outline', label: 'Income', href: { pathname: '/modal/add-transaction', params: { type: 'income' } }, color: () => Colors.income },
  { icon: 'arrow-up-circle-outline', label: 'Expense', href: { pathname: '/modal/add-transaction', params: { type: 'expense' } }, color: () => Colors.expense },
];

/** "+" button that opens Chat / Scan / Transfer / Income / Expense. */
export function AddMenu() {
  const [open, setOpen] = React.useState(false);
  const wide = useWideWeb();
  const go = (o: (typeof ADD_OPTIONS)[number]) => {
    setOpen(false);
    if (o.href) { router.push(o.href); return; }
    const run = async (src: 'camera' | 'library') => {
      const g = await scanReceipt(src);
      if (!g) return;
      router.push({ pathname: '/modal/add-transaction', params: {
        type: 'expense', amount: g.amount ? String(g.amount) : '', memo: g.merchant ?? '', date: g.date ?? '',
      } });
    };
    Alert.alert('Scan receipt', 'Paws reads the total on your phone. The photo isn’t saved or uploaded.', [
      { text: 'Take photo', onPress: () => run('camera') },
      { text: 'Choose from gallery', onPress: () => run('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={() => setOpen(true)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Add" accessibilityHint="Opens chat, scan, transfer, income and expense">
        <Ionicons name="add" size={22} color={Colors.onPrimary} />
        <Text style={styles.fabLabel}>Add</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, wide && { paddingLeft: SIDEBAR_WIDTH + 18 }]} onPress={() => setOpen(false)} accessibilityLabel="Close menu">
          {/* wide web: line the menu up with the FAB at the page column's edge; no bottom tab bar to clear */}
          <View style={[styles.menu, wide && { width: '100%', maxWidth: page.maxWidth - 36, alignSelf: 'center', marginBottom: 0 }]}>
            {ADD_OPTIONS.map(o => (
              <TouchableOpacity key={o.label} style={styles.menuItem} onPress={() => go(o)} accessibilityRole="button">
                <Text style={styles.menuLabel}>{o.label}</Text>
                <View style={[styles.menuIcon, { backgroundColor: o.color() }]}>
                  <Ionicons name={o.icon} size={22} color={Colors.onPrimary} />
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.fab, styles.fabClose]} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={Colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/** Empty-list message. Skip the icon inside a card whose header already names the list; pass `action`
 * for a direct button instead of text telling people which button to find. */
export function EmptyState({ icon, text, action }: {
  icon?: keyof typeof Ionicons.glyphMap; text: string; action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.empty}>
      {icon && <Ionicons name={icon} size={40} color={Colors.primaryLight} />}
      <Text style={styles.emptyText}>{text}</Text>
      {action && (
        <TouchableOpacity style={styles.emptyAction} onPress={action.onPress} accessibilityRole="button">
          <Text style={styles.emptyActionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
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
  label: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.8 },
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
  backdrop: { flex: 1, backgroundColor: 'rgba(11,18,32,0.55)', justifyContent: 'flex-end', alignItems: 'flex-end', padding: 18 },
  menu: { alignItems: 'flex-end', gap: 12, marginBottom: 83 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  menuLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', backgroundColor: 'rgba(15,23,42,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  menuIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  fabClose: { position: 'relative', bottom: 0, right: 0, width: 56, paddingHorizontal: 0, justifyContent: 'center', marginTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyAction: { minHeight: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  emptyActionText: { color: Colors.onPrimary, fontSize: 15, fontWeight: '700' },
}));
