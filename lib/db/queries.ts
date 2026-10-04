/**
 * GasTador — DB Query Functions
 * All reads/writes go through expo-sqlite.
 * Balance rule: posting a transaction immediately updates the linked account balance.
 */

import type { DbAdapter as SQLite } from './DbAdapter';
// Re-export as SQLite type alias so all function signatures below are unchanged
type SQLiteDatabase = SQLite;
import type {
  Account, Budget, Category, DailySummary,
  NetWorth, Profile, Transaction, TransactionType,
} from '../types';
import { countTransactions, SNAPSHOT_SCHEMA, validateSnapshot, type Snapshot } from './snapshot';
export { countTransactions, SNAPSHOT_SCHEMA, validateSnapshot, type Snapshot };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) { return Math.round(n * 100) / 100; }

// ─── Profiles ────────────────────────────────────────────────────────────────

export async function getActiveProfile(db: SQLiteDatabase): Promise<Profile | null> {
  return db.getFirstAsync<Profile>(`SELECT * FROM profiles WHERE is_active = 1 LIMIT 1`);
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export async function getAccounts(db: SQLiteDatabase, profileId: number): Promise<Account[]> {
  return db.getAllAsync<Account>(
    `SELECT * FROM accounts WHERE profile_id = ? ORDER BY created_at ASC`,
    profileId
  );
}

export async function createAccount(
  db: SQLiteDatabase,
  profileId: number,
  data: { name: string; type: Account['type']; balance: number; color: string; icon: string }
): Promise<number> {
  const r = await db.runAsync(
    `INSERT INTO accounts (profile_id, name, type, balance, color, icon) VALUES (?, ?, ?, ?, ?, ?)`,
    profileId, data.name, data.type, fmt(data.balance), data.color, data.icon
  );
  return r.lastInsertRowId;
}

export async function updateAccount(
  db: SQLiteDatabase,
  accountId: number,
  data: { name: string; type: Account['type']; balance: number; color: string; icon: string }
): Promise<void> {
  await db.runAsync(
    `UPDATE accounts SET name = ?, type = ?, balance = ?, color = ?, icon = ? WHERE id = ?`,
    data.name, data.type, fmt(data.balance), data.color, data.icon, accountId
  );
}

export async function updateAccountBalance(
  db: SQLiteDatabase,
  accountId: number,
  delta: number
): Promise<void> {
  await db.runAsync(
    `UPDATE accounts SET balance = balance + ? WHERE id = ?`,
    fmt(delta), accountId
  );
}

export async function deleteAccount(db: SQLiteDatabase, accountId: number): Promise<void> {
  await db.runAsync(`DELETE FROM accounts WHERE id = ?`, accountId);
}

export async function getNetWorth(db: SQLiteDatabase, profileId: number): Promise<NetWorth> {
  const rows = await db.getAllAsync<{ type: string; balance: number }>(
    `SELECT type, balance FROM accounts WHERE profile_id = ? AND include_in_net_worth = 1`,
    profileId
  );
  let assets = 0, liabilities = 0;
  for (const r of rows) {
    if (r.type === 'credit_card' || r.type === 'loan') {
      // debts count as owed whichever sign was entered (people type loans as +50000 or -50000)
      // ponytail: a card overpaid into credit also counts as owed; split sign handling if that shows up
      liabilities += Math.abs(r.balance);
    } else {
      assets += r.balance > 0 ? r.balance : 0;
    }
  }
  return { assets: fmt(assets), liabilities: fmt(liabilities), net: fmt(assets - liabilities) };
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function getCategories(
  db: SQLiteDatabase,
  profileId: number,
  type?: 'income' | 'expense'
): Promise<Category[]> {
  if (type) {
    return db.getAllAsync<Category>(
      `SELECT * FROM categories WHERE profile_id = ? AND type = ? ORDER BY name ASC`,
      profileId, type
    );
  }
  return db.getAllAsync<Category>(
    `SELECT * FROM categories WHERE profile_id = ? ORDER BY type DESC, name ASC`,
    profileId
  );
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions(
  db: SQLiteDatabase,
  profileId: number,
  limit = 50,
  offset = 0
): Promise<Transaction[]> {
  return db.getAllAsync<Transaction>(
    `SELECT
       t.*,
       a.name  AS account_name,
       a.color AS account_color,
       c.name  AS category_name,
       c.icon  AS category_icon,
       c.color AS category_color,
       ta.name AS to_account_name
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN accounts ta ON ta.id = t.to_account_id
     WHERE t.profile_id = ?
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT ? OFFSET ?`,
    profileId, limit, offset
  );
}

export async function getTransactionsByDateRange(
  db: SQLiteDatabase,
  profileId: number,
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  return db.getAllAsync<Transaction>(
    `SELECT
       t.*,
       a.name  AS account_name,
       a.color AS account_color,
       c.name  AS category_name,
       c.icon  AS category_icon,
       c.color AS category_color
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.profile_id = ? AND t.date BETWEEN ? AND ?
     ORDER BY t.date DESC, t.created_at DESC`,
    profileId, startDate, endDate
  );
}

export async function getDailySummary(
  db: SQLiteDatabase,
  profileId: number,
  date: string
): Promise<DailySummary> {
  const row = await db.getFirstAsync<{ income: number; expenses: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expenses
     FROM transactions
     WHERE profile_id = ? AND date = ?`,
    profileId, date
  );
  const income = fmt(row?.income ?? 0);
  const expenses = fmt(row?.expenses ?? 0);
  return { income, expenses, net: fmt(income - expenses) };
}

export async function getMonthlySummary(
  db: SQLiteDatabase,
  profileId: number,
  year: number,
  month: number
): Promise<DailySummary> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  const row = await db.getFirstAsync<{ income: number; expenses: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expenses
     FROM transactions
     WHERE profile_id = ? AND date BETWEEN ? AND ?`,
    profileId, startDate, endDate
  );
  const income = fmt(row?.income ?? 0);
  const expenses = fmt(row?.expenses ?? 0);
  return { income, expenses, net: fmt(income - expenses) };
}

/**
 * Post a transaction and immediately update account balance(s).
 * This is the core write in GasTador — single atomic SQLite transaction.
 */
export async function postTransaction(
  db: SQLiteDatabase,
  profileId: number,
  data: {
    account_id: number;
    to_account_id?: number | null;
    category_id?: number | null;
    type: TransactionType;
    amount: number;
    memo?: string;
    date?: string;
  }
): Promise<number> {
  let newId = 0;
  await db.withTransactionAsync(async () => {
    const r = await db.runAsync(
      `INSERT INTO transactions
         (profile_id, account_id, to_account_id, category_id, type, amount, memo, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      profileId,
      data.account_id,
      data.to_account_id ?? null,
      data.category_id ?? null,
      data.type,
      fmt(data.amount),
      data.memo ?? '',
      data.date ?? new Date().toISOString().slice(0, 10)
    );
    newId = r.lastInsertRowId;

    // Balance rule — immediate update
    if (data.type === 'income') {
      await db.runAsync(
        `UPDATE accounts SET balance = balance + ? WHERE id = ?`,
        fmt(data.amount), data.account_id
      );
    } else if (data.type === 'expense') {
      await db.runAsync(
        `UPDATE accounts SET balance = balance - ? WHERE id = ?`,
        fmt(data.amount), data.account_id
      );
    } else if (data.type === 'transfer' && data.to_account_id) {
      await db.runAsync(
        `UPDATE accounts SET balance = balance - ? WHERE id = ?`,
        fmt(data.amount), data.account_id
      );
      await db.runAsync(
        `UPDATE accounts SET balance = balance + ? WHERE id = ?`,
        fmt(data.amount), data.to_account_id
      );
    }
  });
  return newId;
}

export async function deleteTransaction(
  db: SQLiteDatabase,
  txnId: number
): Promise<void> {
  // Reverse balance effect before deleting
  const txn = await db.getFirstAsync<Transaction>(
    `SELECT * FROM transactions WHERE id = ?`, txnId
  );
  if (!txn) return;

  await db.withTransactionAsync(async () => {
    if (txn.type === 'income') {
      await db.runAsync(
        `UPDATE accounts SET balance = balance - ? WHERE id = ?`,
        fmt(txn.amount), txn.account_id
      );
    } else if (txn.type === 'expense') {
      await db.runAsync(
        `UPDATE accounts SET balance = balance + ? WHERE id = ?`,
        fmt(txn.amount), txn.account_id
      );
    } else if (txn.type === 'transfer' && txn.to_account_id) {
      await db.runAsync(
        `UPDATE accounts SET balance = balance + ? WHERE id = ?`,
        fmt(txn.amount), txn.account_id
      );
      await db.runAsync(
        `UPDATE accounts SET balance = balance - ? WHERE id = ?`,
        fmt(txn.amount), txn.to_account_id
      );
    }
    await db.runAsync(`DELETE FROM transactions WHERE id = ?`, txnId);
  });
}

// ─── Budgets ─────────────────────────────────────────────────────────────────

export async function getBudgets(
  db: SQLiteDatabase,
  profileId: number,
  year: number,
  month: number
): Promise<Budget[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const budgets = await db.getAllAsync<Budget>(
    `SELECT
       b.*,
       c.name  AS category_name,
       c.icon  AS category_icon,
       c.color AS category_color
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     WHERE b.profile_id = ? AND b.period = 'monthly'
     ORDER BY c.name ASC`,
    profileId
  );

  // Attach spent amounts
  for (const budget of budgets) {
    const spent = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE profile_id = ? AND category_id = ? AND type = 'expense'
         AND date BETWEEN ? AND ?`,
      profileId, budget.category_id, startDate, endDate
    );
    budget.spent = fmt(spent?.total ?? 0);
    budget.remaining = fmt(budget.amount - (budget.spent ?? 0));
  }

  return budgets;
}

export async function upsertBudget(
  db: SQLiteDatabase,
  profileId: number,
  categoryId: number,
  amount: number,
  year: number,
  month: number
): Promise<void> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  await db.runAsync(
    `INSERT INTO budgets (profile_id, category_id, amount, period, start_date)
     VALUES (?, ?, ?, 'monthly', ?)
     ON CONFLICT(profile_id, category_id, period, start_date)
     DO UPDATE SET amount = excluded.amount`,
    profileId, categoryId, fmt(amount), startDate
  );
}

export async function deleteBudget(db: SQLiteDatabase, budgetId: number): Promise<void> {
  await db.runAsync(`DELETE FROM budgets WHERE id = ?`, budgetId);
}

// ─── Backup snapshot (cloud sync) ─────────────────────────────────────────────



export async function exportData(db: SQLiteDatabase): Promise<Snapshot> {
  const tables: Snapshot['tables'] = {};
  for (const [table, cols] of Object.entries(SNAPSHOT_SCHEMA)) {
    tables[table] = await db.getAllAsync<Record<string, unknown>>(`SELECT ${cols.join(', ')} FROM ${table}`);
  }
  return { version: 1, tables };
}

/** Replace all local data with a snapshot, atomically (all-or-nothing). */
export async function importData(db: SQLiteDatabase, snap: Snapshot): Promise<void> {
  validateSnapshot(snap);
  await db.withTransactionAsync(async () => {
    // children first so foreign keys never dangle
    for (const t of ['budgets', 'transactions', 'categories', 'accounts', 'profiles']) await db.runAsync(`DELETE FROM ${t}`);
    for (const t of ['profiles', 'accounts', 'categories', 'transactions', 'budgets']) {
      const cols = SNAPSHOT_SCHEMA[t];
      for (const row of snap.tables[t] ?? []) {
        await db.runAsync(
          `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          ...cols.map(c => (row[c] ?? null) as string | number | null)
        );
      }
    }
  });
}

