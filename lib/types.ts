// ─── Domain Types ────────────────────────────────────────────────────────────

export type AccountType = 'cash' | 'bank' | 'credit_card' | 'loan' | 'investment';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';
export type CategoryType = 'income' | 'expense';

// ─── DB Row Shapes ────────────────────────────────────────────────────────────

export interface Profile {
  id: number;
  name: string;
  currency: string;
  created_at: string;
  is_active: number; // 1 = active
}

export interface Account {
  id: number;
  profile_id: number;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  icon: string;
  include_in_net_worth: number; // 1 = yes
  created_at: string;
}

export interface Category {
  id: number;
  profile_id: number;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  parent_id: number | null;
}

export interface Transaction {
  id: number;
  profile_id: number;
  account_id: number;
  to_account_id: number | null; // for transfers
  category_id: number | null;
  type: TransactionType;
  amount: number;
  memo: string;
  date: string; // ISO date string
  created_at: string;
  // joined fields
  account_name?: string;
  account_color?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  to_account_name?: string;
}

export interface Budget {
  id: number;
  profile_id: number;
  category_id: number;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  created_at: string;
  // computed
  spent?: number;
  remaining?: number;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

// ─── App UI Types ─────────────────────────────────────────────────────────────

export interface NetWorth {
  assets: number;
  liabilities: number;
  net: number;
}

export interface DailySummary {
  income: number;
  expenses: number;
  net: number;
}
