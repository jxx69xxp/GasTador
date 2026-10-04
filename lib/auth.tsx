/**
 * Paws — Supabase Auth session context.
 * Env: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_KEY (publishable key, safe to ship in the app)
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

type Mode = 'login' | 'signup';

// ponytail: session (incl. refresh token) in plain AsyncStorage; move to SecureStore+AES if threat model needs it
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Only refresh tokens while the app is in the foreground (Supabase RN guidance)
AppState.addEventListener('change', state => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

const OFFLINE_KEY = 'paws.offline';
const NAME_KEY = 'paws.name';
const PAYDAY_KEY = 'paws.paydays';

const AuthContext = createContext<{
  session: Session | null | undefined; // undefined = still loading
  offline: boolean | undefined;        // true = using the app without an account
  ready: boolean;                      // session + offline flag both loaded
  name: string;                        // display name from Settings ('' = not set)
  paydays: number[];                   // salary days of the month (1–31), [] = no reminders
  signIn: (mode: Mode, email: string, password: string) => Promise<void>;
  continueOffline: () => Promise<void>;
  signOut: () => Promise<void>;        // also leaves offline mode -> back to the welcome screen
  setName: (name: string) => Promise<void>;
  setPaydays: (days: number[]) => Promise<void>;
}>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [offline, setOffline] = useState<boolean | undefined>(undefined);
  const [name, setNameState] = useState('');
  const [paydays, setPaydaysState] = useState<number[]>([]);

  useEffect(() => {
    AsyncStorage.multiGet([OFFLINE_KEY, NAME_KEY, PAYDAY_KEY])
      .then(([[, off], [, n], [, p]]) => {
        setOffline(off === '1');
        setNameState(n ?? '');
        try { setPaydaysState(p ? JSON.parse(p) : []); } catch { setPaydaysState([]); }
      })
      .catch(() => setOffline(false));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn(mode: Mode, email: string, password: string) {
    const creds = { email: email.trim(), password };
    const { data, error } = mode === 'signup'
      // confirmation email opens the app (gastador://login) instead of Supabase's default Site URL
      ? await supabase.auth.signUp({ ...creds, options: { emailRedirectTo: Linking.createURL('/login') } })
      : await supabase.auth.signInWithPassword(creds);
    if (error) throw error;
    // Supabase answers a sign-up for an already-registered email with a fake user (no identities) and sends no email
    if (mode === 'signup' && data.user?.identities?.length === 0) {
      throw new Error('An account with this email already exists. Sign in instead.');
    }
    if (!data.session) throw new Error('Check your email to confirm your account, then log in.');
    await AsyncStorage.removeItem(OFFLINE_KEY);
    setOffline(false);
  }

  async function continueOffline() {
    await AsyncStorage.setItem(OFFLINE_KEY, '1');
    setOffline(true);
  }

  async function signOut() {
    if (session) await supabase.auth.signOut();
    await AsyncStorage.removeItem(OFFLINE_KEY);
    setOffline(false);
  }

  async function setName(n: string) {
    const clean = n.trim().slice(0, 40);
    await AsyncStorage.setItem(NAME_KEY, clean);
    setNameState(clean);
  }

  async function setPaydays(days: number[]) {
    const clean = [...new Set(days.filter(d => Number.isInteger(d) && d >= 1 && d <= 31))].sort((a, b) => a - b);
    await AsyncStorage.setItem(PAYDAY_KEY, JSON.stringify(clean));
    setPaydaysState(clean);
  }

  const ready = session !== undefined && offline !== undefined;

  return (
    <AuthContext.Provider value={{ session, offline, ready, name, paydays, signIn, continueOffline, signOut, setName, setPaydays }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
