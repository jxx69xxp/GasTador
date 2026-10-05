// Run: npx tsc scripts/test-chat-amount.ts --outDir /tmp/ca --module commonjs --target es2022 --esModuleInterop --skipLibCheck --types node && node /tmp/ca/scripts/test-chat-amount.js
import assert from 'node:assert';
import { evaluate, formatAmountInput, formatExpression, parseAmount, pressKey } from '../lib/amount';
import { answer, parseCommand, periodOf, type ChatCtx } from '../lib/chat';

// amount input formatting
assert.strictEqual(formatAmountInput('30000'), '30,000');
assert.strictEqual(formatAmountInput('1234567.891'), '1,234,567.89');
assert.strictEqual(formatAmountInput('0012'), '12');
assert.strictEqual(formatAmountInput('.5'), '0.5');
assert.strictEqual(formatAmountInput('1.2.3'), '1.23');
assert.strictEqual(formatAmountInput('abc'), '');
assert.strictEqual(formatAmountInput('-50000', true), '-50,000');
assert.strictEqual(formatAmountInput('-50000'), '50,000');
assert.strictEqual(parseAmount('30,000.50'), 30000.5);
assert(Number.isNaN(parseAmount('')));

// calculator: precedence, trailing operator, ÷0, garbage
assert.strictEqual(evaluate('1200+300×2'), 1800);
assert.strictEqual(evaluate('100−20÷4'), 95);
assert.strictEqual(evaluate('1,000+'), 1000);
assert.strictEqual(evaluate('10÷3'), 3.33);
assert.strictEqual(evaluate('5÷0'), null);
assert.strictEqual(evaluate('++5'), null);
assert.strictEqual(evaluate(''), null);
assert.strictEqual(formatExpression('1200+30000'), '1,200 + 30,000');

// keypad
const type = (keys: string) => [...keys].reduce(pressKey, '');
assert.strictEqual(type('30000'), '30000');
assert.strictEqual(type('12.345'), '12.34');           // 2 decimals max
assert.strictEqual(type('1..5'), '1.5');                 // one dot per number
assert.strictEqual(type('.5'), '0.5');
assert.strictEqual(type('+5'), '5');                     // can't start with an operator
assert.strictEqual(type('5+−3'), '5−3');                 // operator replaces operator
assert.strictEqual(type('007'), '7');                    // no leading zeros
assert.strictEqual(type('100+50='), '150');
assert.strictEqual(type('5÷0='), '5÷0');                 // invalid stays, not NaN
assert.strictEqual(pressKey('123', '⌫'), '12');

// chat
const now = new Date(2026, 9, 15); // Oct 15 2026
assert.deepStrictEqual(periodOf('spent last month?', now), { from: '2026-09-01', to: '2026-09-30', label: 'last month' });
assert.strictEqual(periodOf('today', now).from, '2026-10-15');
const ctx: ChatCtx = {
  now,
  txns: [
    { date: '2026-10-02', type: 'expense', amount: 255, category_name: 'Food & Dining' },
    { date: '2026-10-05', type: 'expense', amount: 1000, category_name: 'Transportation' },
    { date: '2026-10-15', type: 'income', amount: 30000, category_name: 'Salary' },
    { date: '2026-09-10', type: 'expense', amount: 400, category_name: 'Food & Dining' },
  ],
  accounts: [{ name: 'Cash on Hand', type: 'cash', balance: 5000 }, { name: 'BPI Card', type: 'credit_card', balance: -12000 }],
  budgets: [{ category_name: 'Food & Dining', amount: 200, spent: 255 }],
  goals: [{ name: 'Laptop', target: 45000, saved: 9000 }],
  owed: [{ person: 'Jo', amount: 500, settled: false }, { person: 'Al', amount: 100, settled: true }],
};
assert.strictEqual(answer('How much did I spend this month?', ctx), 'You spent ₱1,255 this month (2 expenses).');
assert.strictEqual(answer('how much on food last month', ctx), 'You spent ₱400 on Food & Dining last month (1 expense).');
assert.match(answer('what did I spend most on?', ctx), /most on Transportation this month: ₱1,000 of ₱1,255/);
assert.match(answer('magkano sweldo ko?', ctx), /income this month is ₱30,000/);
assert.match(answer('how much do I owe', ctx), /You owe ₱12,000: BPI Card/);
assert.match(answer('who owes me money', ctx), /owe you ₱500: Jo ₱500/);
assert.match(answer('what is my balance', ctx), /₱5,000 across your wallets and owe ₱12,000, so your net worth is -₱7,000/);
assert.match(answer('budget?', ctx), /Over budget: Food & Dining/);
assert.match(answer('average spending', ctx), /about ₱400 a month/);
assert.match(answer('asdfgh', ctx), /not sure/);
// commands
const cats = [{ name: 'Food & Dining', type: 'expense' }, { name: 'Transportation', type: 'expense' }, { name: 'Salary', type: 'income' }];
assert.deepStrictEqual(parseCommand('spent 250 on food', cats), { type: 'expense', amount: 250, category: 'Food & Dining', memo: 'food' });
assert.deepStrictEqual(parseCommand('received 30,000 salary', cats), { type: 'income', amount: 30000, category: 'Salary', memo: 'salary' });
assert.strictEqual(parseCommand('paid 1.5k grab transport', cats)?.amount, 1500);
assert.strictEqual(parseCommand('paid 1.5k grab transport', cats)?.category, 'Transportation');
assert.strictEqual(parseCommand('₱120 coffee', cats)?.category, null);           // unknown category stays empty
assert.strictEqual(parseCommand('How much did I spend this month?', cats), null);  // questions are not logs
assert.strictEqual(parseCommand('magkano gastos ko 2026?', cats), null);
assert.strictEqual(parseCommand('spent 0 on food', cats), null);
assert.strictEqual(parseCommand('hello there', cats), null);
console.log('chat+amount ok');
