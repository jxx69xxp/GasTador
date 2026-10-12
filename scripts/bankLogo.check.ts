// Run: node scripts/bankLogo.check.ts   (Node 22.6+ strips the types)
import assert from 'node:assert/strict';
import { bankFromName } from '../lib/bankLogo.ts';

const cases: [string, string | null][] = [
  ['BDO Savings', 'bdo'], ['Banco de Oro', 'bdo'], ['BPI', 'bpi'], ['Maya / GCash', 'maya'],
  ['GCash', 'gcash'], ['G-Cash wallet', 'gcash'], ['PayMaya', 'maya'], ['Union Bank payroll', 'unionbank'],
  ['MariBank', 'seabank'], ['PS Bank', 'psbank'], ['Land Bank ATM', 'landbank'],
  ['Cash on Hand', null], ['Emergency fund', null], ['Bdo-less', 'bdo'], ['abdomen', null],
];
for (const [name, want] of cases) assert.equal(bankFromName(name), want, name);
console.log(`ok: ${cases.length} names`);
