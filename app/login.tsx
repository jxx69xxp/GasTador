import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator, DimensionValue, Image, ImageBackground, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { light as Colors } from '../constants/Colors'; // login art is light-only
import { useAuth } from '../lib/auth';

type Mode = 'login' | 'signup';

// Decorative bubbles floating over the hero gradient (positions are % of hero size)
const BUBBLES: { icon: keyof typeof Ionicons.glyphMap; color: string; size: number; left: DimensionValue; top: DimensionValue }[] = [
  { icon: 'cart',   color: '#6366F1', size: 56, left: '6%',  top: '20%' },
  { icon: 'create', color: '#F59E0B', size: 64, left: '9%',  top: '50%' },
  { icon: 'cash',   color: '#10B981', size: 80, left: '58%', top: '16%' },
  { icon: 'wallet', color: '#B45309', size: 52, left: '80%', top: '46%' },
];

export default function LoginScreen() {
  const { session, offline, signIn } = useAuth();
  const { height } = useWindowDimensions();
  const [mode, setMode] = useState<Mode | null>(null); // null = welcome
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (session || offline) return <Redirect href="/" />;

  const heroH = height * (mode ? 0.34 : 0.56);
  const catSize = heroH * 0.62;

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
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <ImageBackground source={require('../assets/hero-bg.png')} style={{ height: heroH }} resizeMode="cover">
          {!mode && BUBBLES.map(b => (
            <View
              key={b.icon}
              style={[styles.bubble, { width: b.size, height: b.size, borderRadius: b.size / 2, left: b.left, top: b.top }]}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
            >
              <Ionicons name={b.icon} size={b.size * 0.48} color={b.color} />
            </View>
          ))}
          <Image
            source={require('../assets/cat.png')}
            style={[styles.cat, { width: catSize, height: catSize, marginLeft: -catSize / 2 }]}
            accessibilityLabel="Paws cat mascot holding a coin"
          />
        </ImageBackground>

        <View style={styles.body}>
          <Text style={styles.title} accessibilityRole="header">
            {mode === 'signup' ? 'Create your account' : mode === 'login' ? 'Welcome back!' : 'Welcome to Paws!'}
          </Text>
          <Text style={styles.subtitle}>Paws before you spend</Text>

          {!mode ? (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.btn} onPress={() => pick('signup')} accessibilityRole="button">
                <Text style={styles.btnLabel}>Sign Up</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => pick('login')} accessibilityRole="button">
                <Text style={[styles.btnLabel, styles.btnOutlineLabel]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.replace('/mode')} accessibilityRole="button">
                <Text style={[styles.link, { color: Colors.textSecondary }]}>‹ Choose online or offline</Text>
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
                      : <Text style={styles.btnLabel}>{mode === 'login' ? 'Sign In' : 'Sign Up'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pick(mode === 'login' ? 'signup' : 'login')} accessibilityRole="button">
                <Text style={styles.link}>{mode === 'login' ? 'No account yet? Sign up' : 'Have an account? Sign in'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pick(null)} accessibilityRole="button">
                <Text style={[styles.link, { color: Colors.textSecondary }]}>Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  bubble: {
    position: 'absolute', backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  cat: { position: 'absolute', bottom: 0, left: '50%' },
  body: { flex: 1, paddingHorizontal: 32, paddingTop: 20, paddingBottom: 32, width: '100%', maxWidth: 480, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: Colors.ink, textAlign: 'center' },
  subtitle: { fontSize: 17, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
  actions: { gap: 14, marginTop: 28 },
  form: { gap: 10, marginTop: 20 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 4 },
  input: {
    backgroundColor: Colors.offWhite, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
  },
  error: { color: Colors.expense, fontSize: 14 },
  btn: { backgroundColor: Colors.primary, borderRadius: 12, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnOutline: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primary },
  btnLabel: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  btnOutlineLabel: { color: Colors.primary },
  link: { color: Colors.primary, textAlign: 'center', fontWeight: '600', paddingVertical: 12 },
});
