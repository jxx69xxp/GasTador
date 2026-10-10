/**
 * Paws — Plan list schema + helpers (pure; tested by scripts/test-plan.ts).
 * Goals / money owed / planned payments / trips live in AsyncStorage (lib/planStore.ts) and ride along
 * in the cloud backup, so restored data is validated against this whitelist like the DB snapshot is.
 */
import { paydayIn } from './paydayDates';

export type FieldKind = 'text' | 'number' | 'day' | 'date' | 'tag' | 'toggle';
export type Field = { key: string; label: string; kind: FieldKind; required?: boolean };
export type PlanItem = { id: string } & Record<string, string | number | boolean | null>;

export const PLAN_LISTS = {
  goals: [
    { key: 'name', label: 'Goal', kind: 'text', required: true },
    { key: 'target', label: 'Target (₱)', kind: 'number', required: true },
    { key: 'saved', label: 'Saved so far (₱)', kind: 'number' },
  ],
  owed: [
    { key: 'person', label: 'Who owes you', kind: 'text', required: true },
    { key: 'amount', label: 'Amount (₱)', kind: 'number', required: true },
    { key: 'note', label: 'Note', kind: 'text' },
    { key: 'due', label: 'Due date (YYYY-MM-DD)', kind: 'date' },
    { key: 'settled', label: 'Paid back', kind: 'toggle' },
  ],
  planned: [
    { key: 'name', label: 'Payment', kind: 'text', required: true },
    { key: 'amount', label: 'Amount (₱)', kind: 'number', required: true },
    { key: 'day', label: 'Day of month (1–31)', kind: 'day', required: true },
  ],
  reminders: [
    { key: 'name', label: 'Reminder', kind: 'text', required: true },
    { key: 'date', label: 'Date (YYYY-MM-DD)', kind: 'date', required: true },
    { key: 'note', label: 'Note', kind: 'text' },
  ],
  trips: [
    { key: 'name', label: 'Trip', kind: 'text', required: true },
    { key: 'budget', label: 'Budget (₱)', kind: 'number', required: true },
    { key: 'tag', label: 'Tag on expenses (e.g. boracay)', kind: 'tag', required: true },
    { key: 'start', label: 'Start (YYYY-MM-DD)', kind: 'date' },
    { key: 'end', label: 'End (YYYY-MM-DD)', kind: 'date' },
  ],
} satisfies Record<string, Field[]>;
export type PlanListKey = keyof typeof PLAN_LISTS;
export const isPlanList = (k: string): k is PlanListKey => k in PLAN_LISTS;

/** `#Boracay2026 dinner #food` -> ['boracay2026', 'food'] */
export function parseTags(memo: string | null | undefined): string[] {
  return [...new Set([...(memo ?? '').matchAll(/#([\p{L}\p{N}_-]+)/gu)].map(m => m[1].toLowerCase()))];
}

/** Spend per tag (expenses only). */
export function tagTotals(txns: { memo?: string | null; type: string; amount: number }[]) {
  const out = new Map<string, { spent: number; count: number }>();
  for (const t of txns) {
    if (t.type !== 'expense') continue;
    for (const tag of parseTags(t.memo)) {
      const v = out.get(tag) ?? { spent: 0, count: 0 };
      v.spent += t.amount; v.count += 1;
      out.set(tag, v);
    }
  }
  return out;
}

/** Next due date for a monthly payment on `day` (today counts; 31 clamps to short months). */
export function nextDue(day: number, from = new Date()): Date {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const thisMonth = paydayIn(from.getFullYear(), from.getMonth(), day, 0);
  return thisMonth >= today ? thisMonth : paydayIn(from.getFullYear(), from.getMonth() + 1, day, 0);
}

/** Clean + check one form submission. Returns the item or an error message. */
export function cleanItem(list: PlanListKey, input: Record<string, string | boolean>, id: string): PlanItem | string {
  const item: PlanItem = { id };
  for (const f of PLAN_LISTS[list] as Field[]) {
    const raw = input[f.key];
    if (f.kind === 'toggle') { item[f.key] = raw === true; continue; }
    const s = String(raw ?? '').trim();
    if (!s) { if (f.required) return `${f.label} is required.`; item[f.key] = null; continue; }
    if (f.kind === 'number') {
      const n = Number(s.replace(/,/g, ''));
      if (!Number.isFinite(n) || n < 0) return `${f.label} must be a number.`;
      item[f.key] = Math.round(n * 100) / 100;
    } else if (f.kind === 'day') {
      const n = Number(s);
      if (!Number.isInteger(n) || n < 1 || n > 31) return `${f.label} must be 1–31.`;
      item[f.key] = n;
    } else if (f.kind === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(Date.parse(s))) return `${f.label} must look like 2026-10-04.`;
      item[f.key] = s;
    } else if (f.kind === 'tag') {
      const tag = s.replace(/^#/, '').toLowerCase();
      if (!/^[\p{L}\p{N}_-]+$/u.test(tag)) return `${f.label}: letters, numbers, - or _ only.`;
      item[f.key] = tag;
    } else {
      item[f.key] = s.slice(0, 120);
    }
  }
  return item;
}

/** Trust boundary for lists restored from the cloud backup. */
export function validatePlanLists(data: unknown): asserts data is Record<PlanListKey, PlanItem[]> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Backup lists are invalid.');
  for (const [k, items] of Object.entries(data)) {
    if (!isPlanList(k)) throw new Error(`Backup has an unknown list: ${k}`);
    if (!Array.isArray(items) || items.length > 1000) throw new Error(`Backup list ${k} is invalid.`);
    const allowed = new Set(['id', ...(PLAN_LISTS[k] as Field[]).map(f => f.key)]);
    for (const it of items) {
      if (!it || typeof it !== 'object' || typeof (it as PlanItem).id !== 'string') throw new Error(`Backup item in ${k} is invalid.`);
      for (const [f, v] of Object.entries(it)) {
        if (!allowed.has(f)) throw new Error(`Backup has an unknown field: ${k}.${f}`);
        if (v !== null && !['string', 'number', 'boolean'].includes(typeof v)) throw new Error(`Backup value ${k}.${f} is invalid.`);
      }
    }
  }
}
