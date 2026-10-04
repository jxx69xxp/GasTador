import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { useAuth } from '../lib/auth';

type Mode = 'login' | 'signup';
const HERO_RATIO = 1200 / 1100; // assets/hero.png (scripts/make-logo.py)

export default function LoginScreen() {
  const { session, signIn } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode | null>(null); // null = welcome
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (session) return <Redirect href="/" />;

  const contentW = Math.min(width, 480) - 56; // scroll paddingHorizontal 28 × 2
  const heroH = Math.min(height * (mode ? 0.26 : 0.44), contentW / HERO_RATIO);

  function pick(m: Mode | null) {
    setMode(m);
    setError('');
  }

  async function submit() {
    if (!mode) return;
    setBusy(true);
    setError('');
    try {
      await signIn(mode, email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand} accessibilityRole="header">
          <Ionicons name="paw" size={22} color={Colors.primary} />
          <Text style={styles.brandText}>MeowMeow</Text>
        </View>

        <Image
          source={require('../assets/hero.png')}
          style={{ height: heroH, width: heroH * HERO_RATIO, alignSelf: 'center' }}
          accessibilityLabel="MeowMeow cat sitting on a cushion holding a coin"
        />

        <Text style={styles.title}>
          {mode === 'signup' ? 'Create your account' : mode === 'login' ? 'Welcome back!' : 'Welcome to MeowMeow!'}
        </Text>
        <View style={styles.tagline}>
          <Text style={styles.taglineText}>Paws before you spend</Text>
        </View>

        {!mode ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btn} onPress={() => pick('signup')} accessibilityRole="button">
              <Text style={styles.btnLabel}>Get started</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pick('login')} accessibilityRole="button">
              <Text style={styles.link}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com"
              autoCapitalize="none" autoComplete="email" keyboardType="email-address"
              placeholderTextColor={Colors.textMuted} accessibilityLabel="Email"
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input} value={password} onChangeText={setPassword} placeholder="At least 8 characters"
              secureTextEntry autoComplete={mode === 'login' ? 'password' : 'new-password'}
              placeholderTextColor={Colors.textMuted} accessibilityLabel="Password" onSubmitEditing={submit}
            />
            {!!error && <Text style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">{error}</Text>}
            <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy} accessibilityRole="button">
              {busy ? <ActivityIndicator color={Colors.white} />
                    : <Text style={styles.btnLabel}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>}
            </TouchableOpacity>
            <View style={styles.row}>
              <TouchableOpacity onPress={() => pick(null)} accessibilityRole="button" accessibilityLabel="Back">
                <Text style={[styles.link, { color: Colors.textSecondary }]}>‹ Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pick(mode === 'login' ? 'signup' : 'login')} accessibilityRole="button">
                <Text style={styles.link}>{mode === 'login' ? 'Create an account' : 'I have an account'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flexGrow: 1, paddingHorizontal: 28, width: '100%', maxWidth: 480, alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  brandText: { fontSize: 18, fontWeight: '800', color: Colors.primary, letterSpacing: 0.3 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.ink, marginTop: 20 },
  tagline: {
    alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999, backgroundColor: '#FFEDD5',
  },
  taglineText: { color: Colors.accent, fontSize: 16, fontWeight: '700', fontStyle: 'italic' },
  actions: { marginTop: 'auto', paddingTop: 28, gap: 4 },
  form: { gap: 10, marginTop: 20 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 4 },
  input: {
    backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: '#FED7AA',
  },
  error: { color: Colors.expense, fontSize: 14 },
  btn: {
    flexDirection: 'row', gap: 8, backgroundColor: Colors.primary, borderRadius: 16, minHeight: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  btnLabel: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { color: Colors.primary, textAlign: 'center', fontWeight: '700', fontSize: 15, paddingVertical: 14 },
});
