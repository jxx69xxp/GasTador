/**
 * Paws — pull the total, merchant and date out of OCR'd receipt text (pure; tested by scripts/test-receipt.ts).
 * ponytail: keyword + largest-amount heuristic; tune TOTAL_WORDS / SKIP_WORDS with real PH receipts as they come in.
 */

export type ReceiptGuess = { amount: number | null; merchant: string | null; date: string | null };

const TOTAL_WORDS = /\b(grand\s*total|total\s*(amount|due|sales)?|amount\s*due|net\s*amount|balance\s*due|to\s*pay|kabuuan)\b/i;
const SKIP_WORDS = /\b(sub\s*total|subtotal|vat|tax|change|cash|tendered|discount|vatable|exempt|zero[- ]rated|tin|sn|min|qty|item)\b/i;
const MONEY = /(?:₱|php|p)?\s*(\d{1,3}(?:[,\s]\d{3})+(?:\.\d{2})|\d+\.\d{2})\b/gi;

const toNumber = (s: string) => Number(s.replace(/[,\s]/g, ''));

export function parseReceipt(text: string): ReceiptGuess {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const moneyIn = (l: string) => [...l.matchAll(MONEY)].map(m => toNumber(m[1])).filter(n => n > 0 && n < 10_000_000);

  // 1) a "TOTAL" line (or the line right after it, when the amount wraps)
  let amount: number | null = null;
  for (let i = 0; i < lines.length && amount == null; i++) {
    if (!TOTAL_WORDS.test(lines[i]) || /sub\s*total|subtotal/i.test(lines[i])) continue;
    const here = moneyIn(lines[i]);
    const next = here.length ? here : moneyIn(lines[i + 1] ?? '');
    if (next.length) amount = next[next.length - 1];
  }
  // 2) otherwise the largest amount on a line that isn't change / cash / VAT
  if (amount == null) {
    const all = lines.filter(l => !SKIP_WORDS.test(l)).flatMap(moneyIn);
    amount = all.length ? Math.max(...all) : null;
  }

  // merchant: first line with real letters that isn't an address/receipt boilerplate
  const merchant = lines.find(l => /[a-z]{3,}/i.test(l) && !/\d{3,}|receipt|invoice|official|tin\b|vat|tel|www|@/i.test(l)) ?? null;

  // date: 10/05/2026, 2026-10-05, Oct 5, 2026
  let date: string | null = null;
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  const us = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})\b/);
  const pad = (n: string | number) => String(n).padStart(2, '0');
  if (iso) date = `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`;
  else if (us) {
    const y = us[3].length === 2 ? `20${us[3]}` : us[3];
    date = `${y}-${pad(us[1])}-${pad(us[2])}`;                      // PH receipts print MM/DD/YYYY
  }
  if (date && (isNaN(Date.parse(date)) || Number(date.slice(5, 7)) > 12)) date = null;

  return { amount: amount != null ? Math.round(amount * 100) / 100 : null, merchant: merchant?.slice(0, 40) ?? null, date };
}
