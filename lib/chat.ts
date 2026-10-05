/**
 * Paws — offline chat: answers questions about your own data on the phone (pure; tested by
 * scripts/test-chat-amount.ts). Keyword + period matching, English and a little Taglish.
 * ponytail: rule-based, not an LLM; add a Supabase Edge Function + Claude call if free-form questions matter
 * (never ship an API key in the app).
 */

export type ChatTxn = { date: string; type: string; amount: number; category_name?: string | null; memo?: string | null };
export type ChatCtx = {
  now: Date;
  txns: ChatTxn[];                                         // last ~13 months
  accounts: { name: string; type: string; balance: number }[];
  budgets: { category_name?: string; amount: number; spent?: number }[];
  goals: Record<string, unknown>[];      // Plan lists (PlanItem)
  owed: Record<string, unknown>[];
};

const peso = (n: number) => `${n < 0 ? '-' : ''}₱${Math.abs(Math.round(n)).toLocaleString('en-PH')}`;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const has = (q: string, ...words: string[]) => words.some(w => new RegExp(`\\b${w}`, 'i').test(q));

export const SUGGESTIONS = [
  'How much did I spend this month?',
  'What did I spend most on?',
  'How much on food last month?',
  'What’s my balance?',
  'How much do I owe?',
  'How much budget is left?',
];

/** Date range named in the question (default: this month). */
export function periodOf(q: string, now: Date): { from: string; to: string; label: string } {
  const d = (y: number, m: number, day: number) => iso(new Date(y, m, day));
  const y = now.getFullYear(), m = now.getMonth(), today = iso(now);
  if (has(q, 'today', 'ngayon')) return { from: today, to: today, label: 'today' };
  if (has(q, 'yesterday', 'kahapon')) { const t = d(y, m, now.getDate() - 1); return { from: t, to: t, label: 'yesterday' }; }
  if (has(q, 'last week')) { const s = new Date(y, m, now.getDate() - now.getDay() - 7); return { from: iso(s), to: d(s.getFullYear(), s.getMonth(), s.getDate() + 6), label: 'last week' }; }
  if (has(q, 'week')) return { from: d(y, m, now.getDate() - now.getDay()), to: today, label: 'this week' };
  if (has(q, 'last month')) return { from: d(y, m - 1, 1), to: d(y, m, 0), label: 'last month' };
  if (has(q, 'year', 'taon')) return { from: d(y, 0, 1), to: today, label: 'this year' };
  return { from: d(y, m, 1), to: today, label: 'this month' };
}

export function answer(question: string, ctx: ChatCtx): string {
  const q = question.toLowerCase().trim();
  if (!q || has(q, 'help', 'hi', 'hello', 'hey', 'kumusta')) {
    return `Hi! I can answer questions about your money, for example:\n• ${SUGGESTIONS.join('\n• ')}`;
  }
  const p = periodOf(q, ctx.now);
  const inPeriod = ctx.txns.filter(t => t.date >= p.from && t.date <= p.to);
  const sum = (ts: ChatTxn[]) => ts.reduce((s, t) => s + t.amount, 0);
  const debts = ctx.accounts.filter(a => a.type === 'loan' || a.type === 'credit_card');

  // category named in the question ("food" -> "Food & Dining")
  const categories = [...new Set(ctx.txns.map(t => t.category_name).filter(Boolean))] as string[];
  const category = categories.find(c => c.toLowerCase().split(/[^a-z]+/).some(w => w.length >= 3 && q.includes(w)));

  if (has(q, 'owe me', 'owed to me', 'owes me', 'utang sa akin', 'collect')) {
    const open = ctx.owed.filter(o => !o.settled);
    return open.length
      ? `People owe you ${peso(open.reduce((s, o) => s + (Number(o.amount) || 0), 0))}: ${open.map(o => `${o.person} ${peso(Number(o.amount) || 0)}`).join(', ')}.`
      : 'Nobody owes you money right now.';
  }
  if (has(q, 'debt', 'owe', 'utang', 'loan', 'credit')) {
    const total = debts.reduce((s, a) => s + Math.abs(a.balance), 0);
    return total ? `You owe ${peso(total)}: ${debts.map(a => `${a.name} ${peso(Math.abs(a.balance))}`).join(', ')}. See Plan → Debt for your payoff date.` : 'You have no loans or credit card balances. Nice!';
  }
  if (has(q, 'goal', 'saving for')) {
    if (!ctx.goals.length) return 'You have no goals yet. Add one in Plan → Personal goals.';
    return ctx.goals.map(g => `${g.name}: ${peso(Number(g.saved) || 0)} of ${peso(Number(g.target) || 0)}`).join('\n');
  }
  if (has(q, 'budget')) {
    if (!ctx.budgets.length) return 'No budgets set yet. Add one in Plan → Category budget.';
    const left = ctx.budgets.reduce((s, b) => s + b.amount - (b.spent ?? 0), 0);
    const over = ctx.budgets.filter(b => (b.spent ?? 0) > b.amount).map(b => b.category_name);
    return `You have ${peso(left)} of budget left this month.${over.length ? ` Over budget: ${over.join(', ')}.` : ''}`;
  }
  if (has(q, 'balance', 'net worth', 'how much do i have', 'pera', 'wallet')) {
    const named = ctx.accounts.find(a => q.includes(a.name.toLowerCase()) || a.name.toLowerCase().split(/\W+/).some(w => w.length >= 3 && q.includes(w)));
    if (named) return `${named.name} has ${peso(named.balance)}.`;
    const assets = ctx.accounts.filter(a => !debts.includes(a)).reduce((s, a) => s + Math.max(0, a.balance), 0);
    const owe = debts.reduce((s, a) => s + Math.abs(a.balance), 0);
    return `You have ${peso(assets)} across your wallets${owe ? ` and owe ${peso(owe)}, so your net worth is ${peso(assets - owe)}` : ''}.`;
  }
  if (has(q, 'income', 'earn', 'salary', 'sweldo', 'received')) {
    return `Your income ${p.label} is ${peso(sum(inPeriod.filter(t => t.type === 'income')))}.`;
  }
  const expenses = inPeriod.filter(t => t.type === 'expense');
  if (has(q, 'most', 'top', 'biggest', 'highest')) {
    const by = new Map<string, number>();
    expenses.forEach(t => by.set(t.category_name ?? 'Uncategorized', (by.get(t.category_name ?? 'Uncategorized') ?? 0) + t.amount));
    const top = [...by].sort((a, b) => b[1] - a[1]);
    return top.length ? `You spent the most on ${top[0][0]} ${p.label}: ${peso(top[0][1])} of ${peso(sum(expenses))}.` : `No expenses ${p.label} yet.`;
  }
  if (has(q, 'average', 'usually', 'normally')) {
    const months = new Map<string, number>();
    ctx.txns.filter(t => t.type === 'expense').forEach(t => months.set(t.date.slice(0, 7), (months.get(t.date.slice(0, 7)) ?? 0) + t.amount));
    months.delete(iso(ctx.now).slice(0, 7)); // current month is incomplete
    const vals = [...months.values()];
    return vals.length ? `You usually spend about ${peso(vals.reduce((a, b) => a + b, 0) / vals.length)} a month.` : 'I need at least one full month of expenses to work out your average.';
  }
  if (category || has(q, 'spen', 'spent', 'gastos', 'gastu', 'expense', 'cost', 'how much', 'magkano')) {
    const ts = category ? expenses.filter(t => t.category_name === category) : expenses;
    return `You spent ${peso(sum(ts))}${category ? ` on ${category}` : ''} ${p.label}${ts.length ? ` (${ts.length} expense${ts.length === 1 ? '' : 's'})` : ''}.`;
  }
  return `I’m not sure about that one yet. Try:\n• ${SUGGESTIONS.slice(0, 4).join('\n• ')}`;
}

// ─── Commands: "spent 250 on food", "received 30,000 salary" ─────────────────

export type Draft = { type: 'expense' | 'income'; amount: number; category: string | null; memo: string };

const INCOME_WORDS = /\b(received|earned|got paid|income|salary|sweldo|natanggap|sahod)\b/i;
const EXPENSE_WORDS = /\b(spent|spend|paid|pay|bought|buy|gastos|gumastos|binayaran|bayad|expense)\b/i;

/**
 * Turn a logging sentence into a transaction draft, or null if it's a question.
 * Category = the first known category whose name shares a word with the text ("food" -> "Food & Dining").
 */
export function parseCommand(text: string, categories: { name: string; type: string }[]): Draft | null {
  const q = text.trim();
  if (/\?$|^(how|what|who|when|which|magkano|ilan)\b/i.test(q)) return null;   // questions stay questions
  const m = q.match(/(?:₱|php|p)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(k)?\b/i);
  if (!m) return null;
  const amount = Number(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1);
  if (!(amount > 0)) return null;
  const isIncome = INCOME_WORDS.test(q);
  if (!isIncome && !EXPENSE_WORDS.test(q) && q.split(/\s+/).length > 4) return null; // long sentence without a verb: not a log
  const type = isIncome ? 'income' : 'expense';
  const words = q.toLowerCase().replace(m[0].toLowerCase(), ' ').split(/[^a-z]+/).filter(w => w.length >= 3);
  const cat = categories.filter(c => c.type === type)
    .find(c => c.name.toLowerCase().split(/[^a-z]+/).some(w => w.length >= 3 && words.some(x => x.startsWith(w) || w.startsWith(x))));
  const memo = q.replace(m[0], ' ').replace(/\b(i |spent|spend|paid|bought|received|earned|got paid|on|for|sa|ng)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  return { type, amount, category: cat?.name ?? null, memo: memo.slice(0, 80) };
}

/** Follow-up chips after an answer, so the conversation keeps going. */
export function followUps(question: string): string[] {
  const q = question.toLowerCase();
  if (/owe|debt|utang|loan/.test(q)) return ['When will I be debt-free?', 'What’s my balance?'];
  if (/budget/.test(q)) return ['What did I spend most on?', 'How much did I spend this week?'];
  if (/income|salary|sweldo/.test(q)) return ['How much did I spend this month?', 'What’s my balance?'];
  if (/most|top/.test(q)) return ['How much did I spend last month?', 'How much budget is left?'];
  return ['What did I spend most on?', 'How much budget is left?', 'Spent 150 on coffee'];
}
