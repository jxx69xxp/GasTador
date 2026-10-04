/**
 * Paws — System / Light / Dark theme.
 *
 * Every StyleSheet is wrapped in `themed(() => StyleSheet.create({...}))`, which builds one copy per scheme
 * on first use. `ThemeProvider` resolves the preference, switches the palette, and re-mounts the app
 * (key = scheme) so every screen re-renders with the new styles.
 * ponytail: remount-on-change resets in-screen state (scroll, half-filled forms); fine for a rare toggle,
 * move to per-component theme hooks if live switching mid-form matters.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { currentScheme, Scheme, setScheme } from '../constants/Colors';

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'paws.theme';

/** Lazily builds the styles once per scheme; property access returns the active scheme's styles. */
export function themed<T extends object>(build: () => T): T {
  const cache: Partial<Record<Scheme, T>> = {};
  const get = () => (cache[currentScheme()] ??= build());
  return new Proxy({} as T, { get: (_, key) => get()[key as keyof T] });
}

const ThemeContext = createContext<{ pref: ThemePref; scheme: Scheme; setPref: (p: ThemePref) => void }>({
  pref: 'system', scheme: 'light', setPref: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => { if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v); }).catch(() => {});
  }, []);

  const scheme: Scheme = pref === 'system' ? system : pref;
  setScheme(scheme); // before children render, so Colors/themed styles read the right palette

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem(KEY, p).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ pref, scheme, setPref }}>
      <React.Fragment key={scheme}>{children}</React.Fragment>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
