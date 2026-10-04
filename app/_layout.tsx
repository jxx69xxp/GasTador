import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { Suspense, useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { initDatabase, DB_NAME } from '../lib/db/database';
import { DbProvider, NativeDbProvider, WebDbProvider } from '../lib/db/DbContext';
import Colors from '../constants/Colors';
import { AuthProvider, useAuth } from '../lib/auth';

// Keep the native splash up until we know whether to show login or the dashboard (no blank flash)
SplashScreen.preventAutoHideAsync();

function SplashGate() {
  const { session } = useAuth();
  useEffect(() => {
    if (session !== undefined) SplashScreen.hideAsync();
  }, [session]);
  return null;
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
  headerStyle: { backgroundColor: Colors.primary },
  headerTintColor: Colors.white,
  headerTitleStyle: { fontWeight: '700' as const },
});

function AppScreens() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="modal/add-transaction" options={modalOptions('Add Transaction')} />
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
          <StatusBar style="light" />
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
      <StatusBar style="light" />
      <AppScreens />
    </WebDbProvider>
  );
}

const Root = Platform.OS === 'web' ? WebRoot : NativeRoot;

export default function RootLayout() {
  return (
    <AuthProvider>
      <SplashGate />
      <Root />
    </AuthProvider>
  );
}
