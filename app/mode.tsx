/**
 * Paws — "How do you want to use Paws?" (shown before login)
 * Online → sign in / sign up screen. Offline → straight into the app, no account.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadow } from '../components/ui';
import Colors from '../constants/Colors';
import { useAuth } from '../lib/auth';

type Choice = 'online' | 'offline';

const OPTIONS: { id: Choice; icon: keyof typeof Ionicons.glyphMap; title: string; desc: string; points: string[] }[] = [
  {
    id: 'online', icon: 'cloud-outline', title: 'Online', desc: 'Sign in with an account',
    points: ['Log in with your email', 'Your account is ready for future backup & sync'],
  },
  {
    id: 'offline', icon: 'phone-portrait-outline', title: 'Offline', desc: 'No account needed',
    points: ['Start right away, no sign-up', 'Everything stays on this phone'],
  },
];

export default function ModeScreen() {
  const { session, offline, continueOffline } = useAuth();
  const insets = useSafeAreaInsets();
  const [choice, setChoice] = useState<Choice>('online');

  if (session || offline) return <Redirect href="/" />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24 }]}>
        <Image source={require('../assets/splash-icon.png')} style={styles.cat} accessibilityIgnoresInvertColors />
        <Text style={styles.title} accessibilityRole="header">How do you want to use Paws?</Text>
        <Text style={styles.subtitle}>You can switch anytime in Settings.</Text>

        <View style={{ gap: 12, marginTop: 24 }} accessibilityRole="radiogroup">
          {OPTIONS.map(o => {
            const on = choice === o.id;
            return (
              <TouchableOpacity
                key={o.id}
                style={[styles.option, on && styles.optionOn]}
                onPress={() => setChoice(o.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                activeOpacity={0.85}
              >
                <View style={[styles.iconTile, on && { backgroundColor: Colors.primary }]}>
                  <Ionicons name={o.icon} size={24} color={on ? Colors.white : Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>{o.title}</Text>
                  <Text style={styles.optDesc}>{o.desc}</Text>
                  {o.points.map(p => (
                    <View key={p} style={styles.point}>
                      <Ionicons name="checkmark" size={16} color={Colors.income} />
                      <Text style={styles.pointText}>{p}</Text>
                    </View>
                  ))}
                </View>
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={24} color={on ? Colors.primary : Colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => (choice === 'offline' ? continueOffline() : router.push('/login'))}
          accessibilityRole="button"
        >
          <Text style={styles.btnLabel}>{choice === 'offline' ? 'Start offline' : 'Continue to sign in'}</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.screenBg },
  scroll: { paddingHorizontal: 22, paddingBottom: 24, width: '100%', maxWidth: 480, alignSelf: 'center' },
  cat: { width: 96, height: 96, alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginTop: 12 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },

  option: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.border, ...shadow,
  },
  optionOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  iconTile: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  optTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  optDesc: { fontSize: 14, color: Colors.textSecondary, marginTop: 2, marginBottom: 8 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  pointText: { fontSize: 14, color: Colors.textPrimary },

  footer: { paddingHorizontal: 22, paddingTop: 12, backgroundColor: Colors.screenBg },
  btn: {
    flexDirection: 'row', gap: 8, minHeight: 56, borderRadius: 16, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 436, alignSelf: 'center',
  },
  btnLabel: { color: Colors.white, fontSize: 17, fontWeight: '800' },
});
