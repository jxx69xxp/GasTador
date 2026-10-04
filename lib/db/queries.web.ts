/**
 * GasTador — Web Query Layer
 * Metro picks this file automatically on web (platform-specific extension).
 * Uses localStorage + in-memory JS — no SQL, no WASM, no Node deps.
 *
 * Function signatures are identical to queries.ts so all screens work unchanged.
 */

import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../constants/Categories';
import type {
  Account, Budget, Category, DailySummary,
  NetWorth, Profile, Transaction, TransactionType,
} from '../types';
import type { DbAdapter } from './DbAdapter';

// ─── Storage ─────────────────────────────────────────────────────────────────

const KEY = 'gastador_store';

interface WebStore {
  profiles: Profile[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  seeded: boolean;
}

function emptyStore(): WebStore {
  return { profiles: [], accounts: [], categories: [], transactions: [], budgets: [], seeded: false };
}

function load(): WebStore {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : emptyStore();
  } catch { return emptyStore(); }
}

function save(store: WebStore) {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ }
}

function nextId(items: { id: number }[]): number {
  return items.length === 0 ? 1 : Math.max(...items.map(i => i.id)) + 1;
}

function nowISO() { return new Date().toISOString(); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmt(n: number) { return Math.round(n * 100) / 100; }

// ─── Seed ─────────────────────────────────────────────────────────────────────

function seedIfNeeded(store: WebStore) {
  if (store.seeded) return;

  const profileId = 1;
  store.profiles.push({
    id: profileId, name: 'Personal', currency: 'PHP',
    created_at: nowISO(), is_active: 1,
  });

  const accs: Omit<Account, 'id'>[] = [
    { profile_id: profileId, name: 'Cash on Hand', type: 'cash',  balance: 0, color: '#4CAF50', icon: '💵', include_in_net_worth: 1, created_at: nowISO() },
    { profile_id: profileId, name: 'BDO Savings',  type: 'bank',  balance: 0, color: '#2196F3', icon: '🏦', include_in_net_worth: 1, created_at: nowISO() },
    { profile_id: profileId, name: 'Maya / GCash', type: 'bank',  balance: 0, color: '#9C27B0', icon: '📱', include_in_net_worth: 1, created_at: nowISO() },
  ];
  accs.forEach((a, i) => store.accounts.push({ ...a, id: i + 1 }));

  let catId = 1;
  for (const c of DEFAULT_EXPENSE_CATEGORIES) {
    store.categories.push({ id: catId++, profile_id: profileId, name: c.name, type: 'expense', icon: c.icon, color: c.color, parent_id: null });
  }
  for (const c of DEFAULT_INCOME_CATEGORIES) {
    store.categories.push({ id: catId++, profile_id: profileId, name: c.name, type: 'income', icon: c.icon, color: c.color, parent_id: null });
  }

  store.seeded = true;
  save(store);
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export async function getActiveProfile(_db: DbAdapter): Promise<Profile | null> {
  const store = load();
  seedIfNeeded(store);
  return store.profiles.find(p => p.is_active === 1) ?? null;
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export async function getAccounts(_db: DbAdapter, profileId: number): Promise<Account[]> {
  const store = load();
  return store.accounts.filter(a => a.profile_id === profileId)
    .sort((a, b) => a.id - b.id);
}

export async function createAccount(
  _db: DbAdapter,
  profileId: number,
  data: { name: string; type: Account['type']; balance: number; color: string; icon: string }
): Promise<number> {
  const store = load();
  const id = nextId(store.accounts);
  store.accounts.push({ id, profile_id: profileId, include_in_net_worth: 1, created_at: nowISO(), ...data, balance: fmt(data.balance) });
  save(store);
  return id;
}

export async function updateAccountBalance(_db: DbAdapter, accountId: number, delta: number): Promise<void> {
  const store = load();
  const acc = store.accounts.find(a => a.id === accountId);
  if (acc) { acc.balance = fmt(acc.balance + delta); save(store); }
}

export async function deleteAccount(_db: DbAdapter, accountId: number): Promise<void> {
  const store = load();
  store.accounts = store.accounts.filter(a => a.id !== accountId);
  store.transactions = store.transactions.filter(t => t.account_id !== accountId && t.to_account_id !== accountId);
  save(store);
}

export async function getNetWorth(_db: DbAdapter, profileId: number): Promise<NetWorth> {
  const store = load();
  const accs = store.accounts.filter(a => a.profile_id === profileId && a.include_in_net_worth === 1);
  let assets = 0, liabilities = 0;
  for (const a of accs) {
    if ((a.type === 'credit_card' || a.type === 'loan') && a.balance < 0) {
      liabilities += Math.abs(a.balance);
    } else if (a.balance > 0) {
      assets += a.balance;
    }
  }
  return { assets: fmt(assets), liabilities: fmt(liabilities), net: fmt(assets - liabilities) };
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function getCategories(
  _db: DbAdapter,
  profileId: number,
  type?: 'income' | 'expense'
): Promise<Category[]> {
  const store = load();
  return store.categories
    .filter(c => c.profile_id === profileId && (!type || c.type === type))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

function joinTxn(t: Transaction, store: WebStore): Transaction {
  const acc = store.accounts.find(a => a.id === t.account_id);
  const toAcc = t.to_account_id ? store.accounts.find(a => a.id === t.to_account_id) : undefined;
  const cat = t.category_id ? store.categories.find(c => c.id === t.category_id) : undefined;
  return {
    ...t,
    account_name: acc?.name,
    account_color: acc?.color,
    to_account_name: toAcc?.name,
    category_name: cat?.name,
    category_icon: cat?.icon,
    category_color: cat?.color,
  };
}

export async function getTransactions(_db: DbAdapter, profileId: number, limit = 50, offset = 0): Promise<Transaction[]> {
  const store = load();
  const sorted = store.transactions
    .filter(t => t.profile_id === profileId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  return sorted.slice(offset, offset + limit).map(t => joinTxn(t, store));
}

export async function getTransactionsByDateRange(
  _db: DbAdapter, profileId: number, startDate: string, endDate: string
): Promise<Transaction[]> {
  const store = load();
  return store.transactions
    .filter(t => t.profile_id === profileId && t.date >= startDate && t.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(t => joinTxn(t, store));
}

export async function getDailySummary(_db: DbAdapter, profileId: number, date: string): Promise<DailySummary> {
  const store = load();
  const txns = store.transactions.filter(t => t.profile_id === profileId && t.date === date);
  const income = fmt(txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
  const expenses = fmt(txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  return { income, expenses, net: fmt(income - expenses) };
}

export async function getMonthlySummary(
  _db: DbAdapter, profileId: number, year: number, month: number
): Promise<DailySummary> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end   = `${year}-${String(month).padStart(2, '0')}-31`;
  return getTransactionsByDateRange(_db, profileId, start, end).then(txns => {
    const income   = fmt(txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
    const expenses = fmt(txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
    return { income, expenses, net: fmt(income - expenses) };
  });
}

export async function postTransaction(
  _db: DbAdapter,
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
  const store = load();
  const id = nextId(store.transactions);
  const txn: Transaction = {
    id,
    profile_id: profileId,
    account_id: data.account_id,
    to_account_id: data.to_account_id ?? null,
    category_id: data.category_id ?? null,
    type: data.type,
    amount: fmt(data.amount),
    memo: data.memo ?? '',
    date: data.date ?? todayStr(),
    created_at: nowISO(),
  };
  store.transactions.push(txn);

  // Balance rule — immediate update
  const acc = store.accounts.find(a => a.id === data.account_id);
  const toAcc = data.to_account_id ? store.accounts.find(a => a.id === data.to_account_id) : undefined;
  if (acc) {
    if (data.type === 'income')   acc.balance = fmt(acc.balance + data.amount);
    if (data.type === 'expense')  acc.balance = fmt(acc.balance - data.amount);
    if (data.type === 'transfer') acc.balance = fmt(acc.balance - data.amount);
  }
  if (data.type === 'transfer' && toAcc) {
    toAcc.balance = fmt(toAcc.balance + data.amount);
  }

  save(store);
  return id;
}

export async function deleteTransaction(_db: DbAdapter, txnId: number): Promise<void> {
  const store = load();
  const txn = store.transactions.find(t => t.id === txnId);
  if (!txn) return;

  // Reverse balance
  const acc = store.accounts.find(a => a.id === txn.account_id);
  const toAcc = txn.to_account_id ? store.accounts.find(a => a.id === txn.to_account_id) : undefined;
  if (acc) {
    if (txn.type === 'income')   acc.balance = fmt(acc.balance - txn.amount);
    if (txn.type === 'expense')  acc.balance = fmt(acc.balance + txn.amount);
    if (txn.type === 'transfer') acc.balance = fmt(acc.balance + txn.amount);
  }
  if (txn.type === 'transfer' && toAcc) {
    toAcc.balance = fmt(toAcc.balance - txn.amount);
  }

  store.transactions = store.transactions.filter(t => t.id !== txnId);
  save(store);
}

// ─── Budgets ─────────────────────────────────────────────────────────────────

export async function getBudgets(
  _db: DbAdapter, profileId: number, year: number, month: number
): Promise<Budget[]> {
  const store = load();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate   = `${year}-${String(month).padStart(2, '0')}-31`;

  return store.budgets
    .filter(b => b.profile_id === profileId && b.period === 'monthly')
    .map(b => {
      const cat = store.categories.find(c => c.id === b.category_id);
      const spent = fmt(
        store.transactions
          .filter(t => t.profile_id === profileId && t.category_id === b.category_id
                    && t.type === 'expense' && t.date >= startDate && t.date <= endDate)
          .reduce((s, t) => s + t.amount, 0)
      );
      return {
        ...b,
        spent,
        remaining: fmt(b.amount - spent),
        category_name: cat?.name,
        category_icon: cat?.icon,
        category_color: cat?.color,
      };
    })
    .sort((a, b) => (a.category_name ?? '').localeCompare(b.category_name ?? ''));
}

export async function upsertBudget(
  _db: DbAdapter, profileId: number, categoryId: number,
  amount: number, year: number, month: number
): Promise<void> {
  const store = load();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const existing = store.budgets.find(
    b => b.profile_id === profileId && b.category_id === categoryId
      && b.period === 'monthly' && b.start_date === startDate
  );
  if (existing) {
    existing.amount = fmt(amount);
  } else {
    store.budgets.push({
      id: nextId(store.budgets),
      profile_id: profileId,
      category_id: categoryId,
      amount: fmt(amount),
      period: 'monthly',
      start_date: startDate,
      created_at: nowISO(),
    });
  }
  save(store);
}

export async function deleteBudget(_db: DbAdapter, budgetId: number): Promise<void> {
  const store = load();
  store.budgets = store.budgets.filter(b => b.id !== budgetId);
  save(store);
}
