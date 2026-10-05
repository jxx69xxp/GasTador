// Run: npx tsc scripts/test-receipt.ts --outDir /tmp/rc --module commonjs --target es2022 --esModuleInterop --skipLibCheck --types node && node /tmp/rc/scripts/test-receipt.js
import assert from 'node:assert';
import { parseReceipt } from '../lib/receipt';

const jollibee = `JOLLIBEE FOODS CORP
SM Megamall Branch
VAT REG TIN 000-388-474-000
OFFICIAL RECEIPT
10/05/2026 12:41 PM
1 Chickenjoy 1pc     99.00
1 Jolly Spaghetti   65.00
Subtotal           164.00
VAT 12%             17.57
TOTAL              164.00
CASH               200.00
CHANGE              36.00`;
assert.deepStrictEqual(parseReceipt(jollibee), { amount: 164, merchant: 'JOLLIBEE FOODS CORP', date: '2026-10-05' });

// total amount on the next line, thousands separator, ISO date
const grocery = `Puregold Price Club
2026-09-28
Rice 25kg       1,450.00
Eggs              245.50
Amount Due
₱1,695.50
Cash 2,000.00`;
assert.deepStrictEqual(parseReceipt(grocery), { amount: 1695.5, merchant: 'Puregold Price Club', date: '2026-09-28' });

// no TOTAL word: largest non-cash amount wins; change/cash ignored
const noTotal = `Cafe Uno\nLatte 180.00\nCroissant 95.00\nCash 500.00\nChange 225.00`;
assert.strictEqual(parseReceipt(noTotal).amount, 180);

// garbage in -> nulls, never NaN
assert.deepStrictEqual(parseReceipt(''), { amount: null, merchant: null, date: null });
assert.strictEqual(parseReceipt('13/45/2026 hello').date, null);
console.log('receipt ok');
