import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { Suspense } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { initDatabase, DB_NAME } from '../lib/db/database';
import { DbProvider, NativeDbProvider, WebDbProvider } from '../lib/db/DbContext';
import Colors from '../constants/Colors';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { ThemeProvider, useTheme } from '../components/theme';
import { AuthProvider, useAuth } from '../lib/auth';
import { InstallPrompt } from '../components/InstallPrompt';

// Keep the native splash up until we know whether to show login or the dashboard (no blank flash);
// AnimatedSplash then takes over and fades into the app.
SplashScreen.preventAutoHideAsync();

function SplashGate() {
  const { ready } = useAuth();
  return <AnimatedSplash ready={ready} />;
}

function Loading() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
      <ActivityIndicator size="large" color={Colors.onPrimary} />
    </View>
  );
}

const modalOptions = (title: string) => ({
  presentation: 'modal' as const,
  headerShown: true,
  title,
  headerStyle: { backgroundColor: Colors.surface },
  headerTintColor: Colors.textPrimary,
  headerTitleStyle: { fontWeight: '800' as const },
  headerShadowVisible: false,
});

function AppScreens() {
  const { scheme } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <NavThemeProvider value={{
      ...base,
      colors: { ...base.colors, primary: Colors.primary, background: Colors.screenBg, card: Colors.surface, text: Colors.textPrimary, border: Colors.border },
    }}>
    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="mode" />
      <Stack.Screen name="login" />
      <Stack.Screen name="debt" options={{ ...modalOptions('Debt'), presentation: 'card', headerBackTitle: 'Back', contentStyle: { backgroundColor: Colors.screenBg } }} />
      <Stack.Screen name="budgets" options={{ ...modalOptions('Category budget'), presentation: 'card', headerBackTitle: 'Back', contentStyle: { backgroundColor: Colors.screenBg } }} />
      <Stack.Screen name="list/[type]" options={{ ...modalOptions('Plan'), presentation: 'card', headerBackTitle: 'Back', contentStyle: { backgroundColor: Colors.screenBg } }} />
      <Stack.Screen name="chat" options={{ ...modalOptions('Ask Paws'), presentation: 'card', headerBackTitle: 'Back', contentStyle: { backgroundColor: Colors.screenBg } }} />
      <Stack.Screen name="tags" options={{ ...modalOptions('Tags'), presentation: 'card', headerBackTitle: 'Back', contentStyle: { backgroundColor: Colors.screenBg } }} />
      <Stack.Screen name="tools" options={{ ...modalOptions('Tools'), presentation: 'card', headerBackTitle: 'Back', contentStyle: { backgroundColor: Colors.screenBg } }} />
      <Stack.Screen
        name="settings"
        options={{ ...modalOptions('Settings'), presentation: 'card', headerBackTitle: 'Home', contentStyle: { backgroundColor: Colors.screenBg } }}
      />
      <Stack.Screen name="modal/add-transaction" options={{ ...modalOptions('Add Transaction'), headerShown: false }} />
      <Stack.Screen name="modal/add-account"     options={modalOptions('Add Account')} />
      <Stack.Screen name="modal/add-budget"       options={modalOptions('Set Budget')} />
    </Stack>
    </NavThemeProvider>
  );
}

// ── Native: SQLiteProvider → NativeDbProvider → screens ──────────────────────
function NativeRoot() {
  // Lazy require: expo-sqlite has no web module and crashes at import time on web.
  const { SQLiteProvider } = require('expo-sqlite') as typeof import('expo-sqlite');
  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider databaseName={DB_NAME} onInit={initDatabase} useSuspense>
        <NativeDbProvider>
          <AppScreens />
        </NativeDbProvider>
      </SQLiteProvider>
    </Suspense>
  );
}

// ── Web: WebDbProvider → screens (localStorage, no SQLite provider needed) ───
function WebRoot() {
  return (
    <WebDbProvider>
      <AppScreens />
      <InstallPrompt />
    </WebDbProvider>
  );
}

const Root = Platform.OS === 'web' ? WebRoot : NativeRoot;

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <Root />
          <SplashGate />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
