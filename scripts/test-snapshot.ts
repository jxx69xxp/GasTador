// Run: npx tsc scripts/test-snapshot.ts --outDir /tmp/snap --module commonjs --target es2022 --esModuleInterop --skipLibCheck --types node && node /tmp/snap/scripts/test-snapshot.js
// Restored backups come from the network, so validateSnapshot is a trust boundary: table/column names
// end up in SQL, so anything outside the schema must be rejected.
import assert from 'node:assert';
import { countTransactions, validateSnapshot } from '../lib/db/snapshot';

const good = {
  version: 1,
  tables: {
    profiles: [{ id: 1, name: 'Personal', currency: 'PHP', created_at: '2026-10-04', is_active: 1 }],
    transactions: [{ id: 1, profile_id: 1, account_id: 1, to_account_id: null, category_id: 2, type: 'expense', amount: 255, memo: '', date: '2026-10-04', created_at: 'x' }],
  },
};
validateSnapshot(good);
assert.strictEqual(countTransactions(good as never), 1);

const bad = (mutate: (s: any) => void) => { const s = JSON.parse(JSON.stringify(good)); mutate(s); return s; };
assert.throws(() => validateSnapshot(null), /not a Paws snapshot/);
assert.throws(() => validateSnapshot(bad(s => { s.version = 2; })), /not a Paws snapshot/);
assert.throws(() => validateSnapshot(bad(s => { s.tables['users; DROP TABLE accounts'] = []; })), /unknown table/);
assert.throws(() => validateSnapshot(bad(s => { s.tables.transactions[0]['amount) VALUES (1); --'] = 1; })), /unknown column/);
assert.throws(() => validateSnapshot(bad(s => { s.tables.transactions[0].memo = { evil: true }; })), /invalid/);
assert.throws(() => validateSnapshot(bad(s => { s.tables.profiles = []; })), /no profile/);
console.log('snapshot ok');
