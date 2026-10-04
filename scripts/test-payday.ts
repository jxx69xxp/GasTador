// Run: npx tsc scripts/test-payday.ts --outDir /tmp/pd --module commonjs --target es2022 --esModuleInterop --skipLibCheck --types node && node /tmp/pd/scripts/test-payday.js
import assert from 'node:assert';
import { daysUntilPayday, paydayIn, upcomingPaydays } from '../lib/paydayDates';

const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

// clamps to the end of short months
assert.strictEqual(ymd(paydayIn(2026, 1, 30)), '2026-2-28');   // Feb 2026 (not leap)
assert.strictEqual(ymd(paydayIn(2028, 1, 31)), '2028-2-29');   // leap year
assert.strictEqual(ymd(paydayIn(2026, 3, 31)), '2026-4-30');   // April

// 15th + 30th from Oct 4 2026 -> Oct 15, Oct 30, Nov 15, Nov 30, Dec 15...
const up = upcomingPaydays([15, 30], new Date(2026, 9, 4, 12), 3);
assert.deepStrictEqual(up.slice(0, 4).map(ymd), ['2026-10-15', '2026-10-30', '2026-11-15', '2026-11-30']);
assert.strictEqual(up.length, 6);
assert(up.every(d => d.getHours() === 9), 'reminders at 9:00');

// Feb gets its clamped payday, not skipped; duplicates (30 & 31 in Feb) don't double up
const feb = upcomingPaydays([30, 31], new Date(2027, 1, 1), 1).filter(d => d.getMonth() === 1);
assert.deepStrictEqual(feb.map(ymd), ['2027-2-28']);

// countdown
assert.deepStrictEqual(daysUntilPayday([15, 30], new Date(2026, 9, 4, 18))?.days, 11);
assert.strictEqual(daysUntilPayday([15, 30], new Date(2026, 9, 15, 23))?.days, 0);   // payday is today
assert.strictEqual(ymd(daysUntilPayday([15], new Date(2026, 9, 16))!.date), '2026-11-15');
assert.strictEqual(daysUntilPayday([], new Date()), null);
console.log('payday ok');
