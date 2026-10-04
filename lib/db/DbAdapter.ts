/**
 * Platform-agnostic database adapter interface.
 * expo-sqlite's SQLiteDatabase satisfies this on native.
 * SqlJsAdapter satisfies this on web.
 */
export type SQLiteBindValue = string | number | null | boolean | Uint8Array;

export interface DbAdapter {
  getFirstAsync<T>(sql: string, ...params: SQLiteBindValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: SQLiteBindValue[]): Promise<T[]>;
  runAsync(sql: string, ...params: SQLiteBindValue[]): Promise<{ lastInsertRowId: number; changes: number }>;
  execAsync(sql: string): Promise<void>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}
