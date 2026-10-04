/**
 * GasTador — Supabase Auth session context.
 * Env: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_KEY (publishable key, safe to ship in the app)
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';
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

const AuthContext = createContext<{
  session: Session | null | undefined; // undefined = still loading
  signIn: (mode: Mode, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn(mode: Mode, email: string, password: string) {
    const creds = { email: email.trim(), password };
    const { data, error } = mode === 'signup'
      ? await supabase.auth.signUp(creds)
      : await supabase.auth.signInWithPassword(creds);
    if (error) throw error;
    if (!data.session) throw new Error('Check your email to confirm your account, then log in.');
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return <AuthContext.Provider value={{ session, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
