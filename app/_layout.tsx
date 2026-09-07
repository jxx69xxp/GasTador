import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { initDatabase, DB_NAME } from '../lib/db/database';
import Colors from '../constants/Colors';

function Loading() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
      <ActivityIndicator size="large" color={Colors.white} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider databaseName={DB_NAME} onInit={initDatabase} useSuspense>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal/add-transaction"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Add Transaction',
              headerStyle: { backgroundColor: Colors.primary },
              headerTintColor: Colors.white,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="modal/add-account"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Add Account',
              headerStyle: { backgroundColor: Colors.primary },
              headerTintColor: Colors.white,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="modal/add-budget"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Set Budget',
              headerStyle: { backgroundColor: Colors.primary },
              headerTintColor: Colors.white,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
        </Stack>
      </SQLiteProvider>
    </Suspense>
  );
}
