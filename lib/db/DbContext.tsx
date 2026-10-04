/**
 * GasTador — Cross-platform DB Context
 *
 * Native : wraps expo-sqlite's SQLiteDatabase
 * Web    : queries.web.ts manages localStorage directly — db param is a no-op stub
 */
import React, { createContext, useContext } from 'react';
import { Platform } from 'react-native';
import type { DbAdapter } from './DbAdapter';

// A no-op stub used on web (queries.web.ts ignores the db param entirely)
const WEB_STUB: DbAdapter = {
  getFirstAsync: async () => null,
  getAllAsync: async () => [],
  runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
  execAsync: async () => {},
  withTransactionAsync: async (fn) => fn(),
};

const DbContext = createContext<DbAdapter>(WEB_STUB);

export function useDb(): DbAdapter {
  return useContext(DbContext);
}

// ─── Native Provider — must be rendered inside expo-sqlite's <SQLiteProvider> ─
export function NativeDbProvider({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useSQLiteContext } = require('expo-sqlite') as typeof import('expo-sqlite');
  const sqliteDb = useSQLiteContext();
  return (
    <DbContext.Provider value={sqliteDb as unknown as DbAdapter}>
      {children}
    </DbContext.Provider>
  );
}

// ─── Web Provider — just renders children (queries use localStorage directly) ─
export function WebDbProvider({ children }: { children: React.ReactNode }) {
  return (
    <DbContext.Provider value={WEB_STUB}>
      {children}
    </DbContext.Provider>
  );
}

// Auto-select the right provider for each platform
export const DbProvider = Platform.OS === 'web' ? WebDbProvider : NativeDbProvider;
