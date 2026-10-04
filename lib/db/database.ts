/**
 * GasTador — SQLite Database Layer
 * Uses expo-sqlite (v14+) synchronous API (useSQLiteContext hook pattern)
 *
 * Schema version: 1
 */

import type { DbAdapter } from './DbAdapter';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../constants/Categories';

export const DB_NAME = 'gastador.db';

// ─── DDL ─────────────────────────────────────────────────────────────────────

const DDL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL DEFAULT 'Personal',
  currency    TEXT    NOT NULL DEFAULT 'PHP',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  is_active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS accounts (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id           INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                 TEXT    NOT NULL,
  type                 TEXT    NOT NULL DEFAULT 'cash',
  balance              REAL    NOT NULL DEFAULT 0,
  color                TEXT    NOT NULL DEFAULT '#0D6B3E',
  icon                 TEXT    NOT NULL DEFAULT '💵',
  include_in_net_worth INTEGER NOT NULL DEFAULT 1,
  created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  type       TEXT    NOT NULL DEFAULT 'expense',
  icon       TEXT    NOT NULL DEFAULT '📦',
  color      TEXT    NOT NULL DEFAULT '#90A4AE',
  parent_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id    INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id INTEGER          REFERENCES accounts(id) ON DELETE SET NULL,
  category_id   INTEGER          REFERENCES categories(id) ON DELETE SET NULL,
  type          TEXT    NOT NULL DEFAULT 'expense',
  amount        REAL    NOT NULL DEFAULT 0,
  memo          TEXT    NOT NULL DEFAULT '',
  date          TEXT    NOT NULL DEFAULT (date('now')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_txn_profile ON transactions(profile_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_txn_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_txn_category ON transactions(category_id);

CREATE TABLE IF NOT EXISTS budgets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount      REAL    NOT NULL DEFAULT 0,
  period      TEXT    NOT NULL DEFAULT 'monthly',
  start_date  TEXT    NOT NULL DEFAULT (date('now', 'start of month')),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(profile_id, category_id, period, start_date)
);

CREATE TABLE IF NOT EXISTS db_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// ─── Seeder ──────────────────────────────────────────────────────────────────

async function seedDefaultData(db: DbAdapter): Promise<void> {
  const alreadySeeded = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM db_meta WHERE key = 'seeded'`
  );
  if (alreadySeeded) return;

  // Default profile
  const profile = await db.runAsync(
    `INSERT INTO profiles (name, currency) VALUES ('Personal', 'PHP')`
  );
  const profileId = profile.lastInsertRowId;

  // Default accounts
  await db.runAsync(
    `INSERT INTO accounts (profile_id, name, type, balance, color, icon) VALUES
      (?, 'Cash on Hand', 'cash',        0, '#4CAF50', '💵'),
      (?, 'BDO Savings',  'bank',        0, '#2196F3', '🏦'),
      (?, 'Maya / GCash', 'bank',        0, '#9C27B0', '📱')`,
    profileId, profileId, profileId
  );

  // Expense categories
  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    await db.runAsync(
      `INSERT INTO categories (profile_id, name, type, icon, color) VALUES (?, ?, 'expense', ?, ?)`,
      profileId, cat.name, cat.icon, cat.color
    );
  }

  // Income categories
  for (const cat of DEFAULT_INCOME_CATEGORIES) {
    await db.runAsync(
      `INSERT INTO categories (profile_id, name, type, icon, color) VALUES (?, ?, 'income', ?, ?)`,
      profileId, cat.name, cat.icon, cat.color
    );
  }

  await db.runAsync(
    `INSERT INTO db_meta (key, value) VALUES ('seeded', '1'), ('schema_version', '1')`
  );
}

// ─── Init — called by SQLiteProvider's onInit ─────────────────────────────────

export async function initDatabase(db: DbAdapter): Promise<void> {
  await db.execAsync(DDL);
  await seedDefaultData(db);
}
