// Run: npx tsc scripts/test-projection.ts --outDir /tmp/proj --module commonjs --target es2022 --esModuleInterop --skipLibCheck --types node && node /tmp/proj/scripts/test-projection.js
import assert from 'node:assert';
import { advice, monthEndProjection, monthsToPayoff, payoffPlan, type Debt } from '../lib/projection';

// no interest: 10,000 at 2,500/mo = 4 months; 10,001 -> 5
assert.strictEqual(monthsToPayoff(10000, 2500), 4);
assert.strictEqual(monthsToPayoff(10001, 2500), 5);
assert.strictEqual(monthsToPayoff(0, 100), 0);
assert.strictEqual(monthsToPayoff(1000, 0), Infinity);
// 24% APR = 2%/mo: 10,000 needs > 200/mo just for interest
assert.strictEqual(monthsToPayoff(10000, 200, 24), Infinity);
assert.strictEqual(monthsToPayoff(10000, 1000, 24), 12);   // standard amortization: ~11.2 -> 12 payments

// rollover: A 1,000 @ 500/mo clears in 2; its 500 then joins B (3,000 @ 500) -> B done month 4 (500+500+1000+1000)
const debts: Debt[] = [
  { id: 1, name: 'Card', owed: 1000, payment: 500, apr: 0 },
  { id: 2, name: 'Loan', owed: 3000, payment: 500, apr: 0 },
];
const p = payoffPlan(debts, 0, 'snowball');
assert.deepStrictEqual([p.months, p.paidOff[1], p.paidOff[2]], [4, 2, 4]);
assert.strictEqual(payoffPlan(debts, 1000, 'snowball').months, 2);       // 2,000/mo budget clears 4,000 in 2
assert.strictEqual(payoffPlan([{ id: 1, name: 'x', owed: 5000, payment: 50, apr: 36 }], 0, 'avalanche').months, Infinity);

// avalanche targets the highest APR first
const mixed: Debt[] = [{ id: 1, name: 'Small', owed: 500, payment: 100, apr: 5 }, { id: 2, name: 'Pricey', owed: 5000, payment: 100, apr: 30 }];
assert.strictEqual(payoffPlan(mixed, 0, 'avalanche').order[0].name, 'Pricey');
assert.strictEqual(payoffPlan(mixed, 0, 'snowball').order[0].name, 'Small');
assert(payoffPlan(mixed, 500, 'avalanche').interest < payoffPlan(mixed, 500, 'snowball').interest, 'avalanche pays less interest');

// month-end projection: 3,000 by day 10 of a 30-day month -> 9,000
assert.strictEqual(monthEndProjection(3000, 10, 30), 9000);

// advice
assert.deepStrictEqual(advice({ salary: 0, avgExpenses: 0, debts: [] }), ['Add your monthly salary so I can build your plan.']);
const tips = advice({ salary: 20000, avgExpenses: 19000, debts: [{ id: 1, name: 'Card', owed: 10000, payment: 100, apr: 24 }] });
assert(tips.some(t => t.includes('doesn’t cover')), 'flags payment below interest');
assert(tips.some(t => t.includes('50/30/20')), 'flags high spending');
assert(advice({ salary: 30000, avgExpenses: 10000, debts: [] }).some(t => t.includes('emergency fund')));
console.log('projection ok');
