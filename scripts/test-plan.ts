// Run: npx tsc scripts/test-plan.ts --outDir /tmp/plan --module commonjs --target es2022 --esModuleInterop --skipLibCheck --types node && node /tmp/plan/scripts/test-plan.js
import assert from 'node:assert';
import { cleanItem, nextDue, parseTags, tagTotals, validatePlanLists } from '../lib/planMath';

const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

// tags
assert.deepStrictEqual(parseTags('#Boracay2026 dinner #food #food'), ['boracay2026', 'food']);
assert.deepStrictEqual(parseTags('no tags here'), []);
assert.deepStrictEqual(parseTags(null), []);
const totals = tagTotals([
  { memo: 'lunch #boracay', type: 'expense', amount: 300 },
  { memo: 'hotel #Boracay', type: 'expense', amount: 2000 },
  { memo: 'refund #boracay', type: 'income', amount: 500 },
]);
assert.deepStrictEqual(totals.get('boracay'), { spent: 2300, count: 2 });

// planned payments: due day today counts; past -> next month; 31 clamps
assert.strictEqual(ymd(nextDue(15, new Date(2026, 9, 15, 20))), '2026-10-15');
assert.strictEqual(ymd(nextDue(10, new Date(2026, 9, 15))), '2026-11-10');
assert.strictEqual(ymd(nextDue(31, new Date(2026, 1, 3))), '2026-2-28');

// form cleaning (input validation)
assert.deepStrictEqual(cleanItem('goals', { name: ' Laptop ', target: '45,000', saved: '' }, 'a'),
  { id: 'a', name: 'Laptop', target: 45000, saved: null });
assert.strictEqual(cleanItem('goals', { name: '', target: '1' }, 'a'), 'Goal is required.');
assert.match(cleanItem('goals', { name: 'x', target: 'abc' }, 'a') as string, /must be a number/);
assert.match(cleanItem('planned', { name: 'Rent', amount: '9000', day: '32' }, 'a') as string, /1–31/);
assert.match(cleanItem('owed', { person: 'Jo', amount: '5', due: '10/04/2026' }, 'a') as string, /2026-10-04/);
assert.strictEqual((cleanItem('trips', { name: 'Bora', budget: '20000', tag: '#Boracay' }, 'a') as any).tag, 'boracay');
assert.strictEqual((cleanItem('owed', { person: 'Jo', amount: '5', settled: true }, 'a') as any).settled, true);

// restored lists are a trust boundary
validatePlanLists({ goals: [{ id: '1', name: 'Laptop', target: 45000, saved: null }] });
assert.throws(() => validatePlanLists({ hacks: [] }), /unknown list/);
assert.throws(() => validatePlanLists({ goals: [{ id: '1', evil: 'x' }] }), /unknown field/);
assert.throws(() => validatePlanLists({ goals: [{ id: '1', name: { $gt: '' } }] }), /invalid/);
assert.throws(() => validatePlanLists({ goals: [{ name: 'no id' }] }), /invalid/);
console.log('plan ok');
