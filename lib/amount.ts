/**
 * Paws — amount entry helpers (pure; tested by scripts/test-chat-amount.ts).
 * Inputs show "30,000.5"; parse strips commas. Calculator evaluates + − × ÷ without eval().
 */

/** Live-format typed text as a peso amount: digits, one dot, 2 decimals, thousands commas. */
export function formatAmountInput(text: string, allowNegative = false): string {
  const neg = allowNegative && text.trim().startsWith('-');
  const s = text.replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  const int = (dot >= 0 ? s.slice(0, dot) : s).replace(/^0+(?=\d)/, '');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const out = dot >= 0 ? `${grouped || '0'}.${s.slice(dot + 1).replace(/\./g, '').slice(0, 2)}` : grouped;
  return neg ? `-${out}` : out;
}

/** "30,000.50" -> 30000.5 ; invalid -> NaN */
export const parseAmount = (s: string | number | null | undefined) => {
  const n = Number(String(s ?? '').replace(/,/g, '').trim());
  return String(s ?? '').trim() === '' ? NaN : n;
};

const OPS = '+−×÷';

/** Evaluate "1,200+300×2" with × ÷ before + −. Trailing operator ignored. null = invalid / ÷0. */
export function evaluateExpression(expr: string): number | null {
  const tokens = expr.replace(/,/g, '').replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−')
    .match(/\d+\.?\d*|\.\d+|[+−×÷]/g);
  if (!tokens) return null;
  if (OPS.includes(tokens[tokens.length - 1])) tokens.pop();
  const nums: number[] = [], ops: string[] = [];
  tokens.forEach((t, i) => {
    const isOp = OPS.includes(t);
    if (isOp !== (i % 2 === 1)) throw null; // must alternate number/operator
    isOp ? ops.push(t) : nums.push(Number(t));
  });
  // × ÷ first
  const n2 = [nums[0]], o2: string[] = [];
  ops.forEach((op, i) => {
    const b = nums[i + 1];
    if (op === '×') n2[n2.length - 1] *= b;
    else if (op === '÷') { if (b === 0) throw null; n2[n2.length - 1] /= b; }
    else { o2.push(op); n2.push(b); }
  });
  const total = o2.reduce((acc, op, i) => (op === '+' ? acc + n2[i + 1] : acc - n2[i + 1]), n2[0]);
  return Number.isFinite(total) ? Math.round(total * 100) / 100 : null;
}

/** Safe wrapper: malformed input -> null instead of throwing. */
export function evaluate(expr: string): number | null {
  try { return evaluateExpression(expr); } catch { return null; }
}

/** Show each number in an expression with commas: "1200+3000" -> "1,200 + 3,000" */
export function formatExpression(expr: string): string {
  return expr.split(/([+−×÷])/).map(p => (OPS.includes(p) && p ? ` ${p} ` : p ? formatAmountInput(p) : '')).join('');
}

export const hasOperator = (expr: string) => /[+−×÷]/.test(expr);

/** Apply one key press to the expression (keeps it well-formed: one operator in a row, one dot per number, 2 decimals). */
export function pressKey(expr: string, key: string): string {
  if (key === 'C') return '';
  if (key === '⌫') return expr.slice(0, -1);
  if (key === '=') { const v = evaluate(expr); return v == null ? expr : String(v); }
  const last = expr.slice(-1);
  if (OPS.includes(key)) {
    if (!expr) return '';
    return OPS.includes(last) ? expr.slice(0, -1) + key : expr + key;
  }
  const current = expr.split(/[+−×÷]/).pop() ?? '';
  if (key === '.') return current.includes('.') ? expr : expr + (current ? '.' : '0.');
  if (/\.\d{2}$/.test(current)) return expr;             // max 2 decimals
  if (current === '0') return expr.slice(0, -1) + key;   // no leading zeros
  return current.replace('.', '').length >= 10 ? expr : expr + key;
}

