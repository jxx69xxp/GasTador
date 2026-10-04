import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { Suspense } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { initDatabase, DB_NAME } from '../lib/db/database';
import { DbProvider, NativeDbProvider, WebDbProvider } from '../lib/db/DbContext';
import Colors from '../constants/Colors';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { AuthProvider, useAuth } from '../lib/auth';

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
      <ActivityIndicator size="large" color={Colors.white} />
    </View>
  );
}

const modalOptions = (title: string) => ({
  presentation: 'modal' as const,
  headerShown: true,
  title,
  headerStyle: { backgroundColor: Colors.white },
  headerTintColor: Colors.textPrimary,
  headerTitleStyle: { fontWeight: '800' as const },
  headerShadowVisible: false,
});

function AppScreens() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="mode" />
      <Stack.Screen name="login" />
      <Stack.Screen
        name="settings"
        options={{ ...modalOptions('Settings'), presentation: 'card', headerBackTitle: 'Home', contentStyle: { backgroundColor: Colors.screenBg } }}
      />
      <Stack.Screen name="modal/add-transaction" options={{ ...modalOptions('Add Transaction'), headerShown: false }} />
      <Stack.Screen name="modal/add-account"     options={modalOptions('Add Account')} />
      <Stack.Screen name="modal/add-budget"       options={modalOptions('Set Budget')} />
    </Stack>
  );
}

// ── Native: SQLiteProvider → NativeDbProvider → screens ──────────────────────
function NativeRoot() {
  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider databaseName={DB_NAME} onInit={initDatabase} useSuspense>
        <NativeDbProvider>
          <StatusBar style="dark" />
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
      <StatusBar style="dark" />
      <AppScreens />
    </WebDbProvider>
  );
}

const Root = Platform.OS === 'web' ? WebRoot : NativeRoot;

export default function RootLayout() {
  return (
    <AuthProvider>
      <Root />
      <SplashGate />
    </AuthProvider>
  );
}
