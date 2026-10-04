/**
 * Paws — backup snapshot format (pure: no React Native imports, so it's testable with plain node).
 * A snapshot is every local table as plain rows. Anything restored from the cloud is validated
 * against this schema before it touches the database (table/column names are never trusted).
 */

/** Tables + columns a snapshot may contain. Restored data is checked against this list, never trusted. */
export const SNAPSHOT_SCHEMA: Record<string, string[]> = {
  profiles: ['id', 'name', 'currency', 'created_at', 'is_active'],
  accounts: ['id', 'profile_id', 'name', 'type', 'balance', 'color', 'icon', 'include_in_net_worth', 'created_at'],
  categories: ['id', 'profile_id', 'name', 'type', 'icon', 'color', 'parent_id'],
  transactions: ['id', 'profile_id', 'account_id', 'to_account_id', 'category_id', 'type', 'amount', 'memo', 'date', 'created_at'],
  budgets: ['id', 'profile_id', 'category_id', 'amount', 'period', 'start_date', 'created_at'],
};
export type Snapshot = { version: 1; tables: Record<string, Record<string, unknown>[]> };

export function validateSnapshot(snap: unknown): asserts snap is Snapshot {
  const s = snap as Snapshot;
  if (!s || s.version !== 1 || typeof s.tables !== 'object') throw new Error('Backup is not a Paws snapshot.');
  for (const [t, rows] of Object.entries(s.tables)) {
    if (!SNAPSHOT_SCHEMA[t] || !Array.isArray(rows)) throw new Error(`Backup has an unknown table: ${t}`);
    for (const row of rows) {
      if (!row || typeof row !== 'object') throw new Error(`Backup row in ${t} is invalid.`);
      for (const [k, v] of Object.entries(row)) {
        if (!SNAPSHOT_SCHEMA[t].includes(k)) throw new Error(`Backup has an unknown column: ${t}.${k}`);
        if (v !== null && typeof v !== 'string' && typeof v !== 'number') throw new Error(`Backup value ${t}.${k} is invalid.`);
      }
    }
  }
  if (!s.tables.profiles?.length) throw new Error('Backup has no profile.');
}

export const countTransactions = (snap: Snapshot) => snap.tables.transactions?.length ?? 0;
