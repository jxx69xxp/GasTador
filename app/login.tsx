import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import Colors from '../constants/Colors';
import { useAuth } from '../lib/auth';

export default function LoginScreen() {
  const { session, signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (session) return <Redirect href="/" />;

  async function submit() {
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
      <View style={styles.card}>
        <Image source={require('../assets/logo.png')} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={styles.title} accessibilityRole="header">GasTador</Text>
        <Text style={styles.subtitle}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
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
        <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.btnLabel}>{mode === 'login' ? 'Log in' : 'Sign up'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
          <Text style={styles.switch}>
            {mode === 'login' ? "No account yet? Sign up" : 'Have an account? Log in'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.primary, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, gap: 12, width: '100%', maxWidth: 420, alignSelf: 'center' },
  logo: { width: 72, height: 72, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: Colors.primary, textAlign: 'center' },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 8 },
  input: {
    backgroundColor: Colors.offWhite, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
  },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: -4 },
  error: { color: Colors.expense, fontSize: 14 },
  btn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnLabel: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  switch: { color: Colors.primary, textAlign: 'center', fontWeight: '600', paddingVertical: 12 }, // 44pt tap target
});
