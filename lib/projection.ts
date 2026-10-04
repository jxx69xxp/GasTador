/**
 * Paws — debt payoff + spending projection math (pure, no React Native imports; tested by scripts/test-projection.ts).
 * General budgeting guidance only, not licensed financial advice.
 */

export type Debt = { id: number; name: string; owed: number; payment: number; apr: number }; // apr = % per year
export type Strategy = 'avalanche' | 'snowball';

const MAX_MONTHS = 600; // 50 years: beyond this we call it "never"

/** Months to clear one debt paying a fixed amount monthly (interest compounds monthly). Infinity = never. */
export function monthsToPayoff(owed: number, payment: number, apr = 0): number {
  if (owed <= 0) return 0;
  const r = apr / 100 / 12;
  if (payment <= 0 || payment <= owed * r) return Infinity; // payment doesn't even cover interest
  let b = owed;
  for (let m = 1; m <= MAX_MONTHS; m++) {
    b = b * (1 + r) - payment;
    if (b <= 0.005) return m;
  }
  return Infinity;
}

/** Order debts for extra payments: avalanche = highest interest first, snowball = smallest balance first. */
export function orderDebts(debts: Debt[], strategy: Strategy): Debt[] {
  return [...debts].sort((a, b) =>
    strategy === 'avalanche' ? b.apr - a.apr || a.owed - b.owed : a.owed - b.owed || b.apr - a.apr);
}

/**
 * Pay every debt its monthly payment; `extra` (plus payments freed by cleared debts) goes to the first
 * unpaid debt in strategy order. Returns months until all are clear (Infinity = never) and interest paid.
 */
export function payoffPlan(debts: Debt[], extra: number, strategy: Strategy) {
  const order = orderDebts(debts.filter(d => d.owed > 0), strategy);
  const bal = new Map(order.map(d => [d.id, d.owed]));
  const budget = order.reduce((s, d) => s + Math.max(0, d.payment), 0) + Math.max(0, extra);
  const paidOff: Record<number, number> = {};
  let interest = 0;
  for (let m = 1; m <= MAX_MONTHS; m++) {
    for (const d of order) {
      const b = bal.get(d.id)!;
      if (b > 0) { const i = b * (d.apr / 100 / 12); interest += i; bal.set(d.id, b + i); }
    }
    let left = budget;
    for (const d of order) {                       // minimums first
      const b = bal.get(d.id)!;
      if (b <= 0) continue;
      const pay = Math.min(b, Math.max(0, d.payment), left);
      bal.set(d.id, b - pay); left -= pay;
    }
    for (const d of order) {                       // then the rest goes down the list
      const b = bal.get(d.id)!;
      if (b <= 0 || left <= 0) continue;
      const pay = Math.min(b, left);
      bal.set(d.id, b - pay); left -= pay;
    }
    for (const d of order) if (bal.get(d.id)! <= 0.005 && !paidOff[d.id]) paidOff[d.id] = m;
    if (order.every(d => bal.get(d.id)! <= 0.005)) return { months: m, interest, paidOff, order };
  }
  return { months: Infinity, interest, paidOff, order };
}

/** Where this month's spending lands if the current daily pace continues. */
export function monthEndProjection(spentSoFar: number, day: number, daysInMonth: number) {
  return day <= 0 ? 0 : (spentSoFar / day) * daysInMonth;
}

export const addMonths = (from: Date, months: number) => new Date(from.getFullYear(), from.getMonth() + months, 1);

/** Paws' tips: ordered most-urgent first. */
export function advice(input: {
  salary: number; avgExpenses: number; debts: Debt[]; topCategory?: { name: string; share: number } | null;
}): string[] {
  const { salary, avgExpenses, debts, topCategory } = input;
  const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;
  const owing = debts.filter(d => d.owed > 0);
  const payments = owing.reduce((s, d) => s + d.payment, 0);
  const free = salary - avgExpenses - payments;
  const tips: string[] = [];

  if (salary <= 0) return ['Add your monthly salary so I can build your plan.'];

  for (const d of owing) {
    const r = d.apr / 100 / 12;
    if (d.payment <= 0) tips.push(`${d.name}: set a monthly payment to see when it’s paid off.`);
    else if (d.payment <= d.owed * r) tips.push(`${d.name}: ${peso(d.payment)}/mo doesn’t cover the ${peso(d.owed * r)} interest. Pay more or it never ends.`);
  }
  if (free < 0) tips.push(`Spending plus payments are ${peso(-free)} more than your salary each month. Trim wants first, then talk to lenders about lower payments.`);
  if (avgExpenses / salary > 0.8) tips.push(`You spend ${Math.round((avgExpenses / salary) * 100)}% of your salary. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings & debt.`);
  if (payments / salary > 0.36) tips.push(`Debt payments take ${Math.round((payments / salary) * 100)}% of your salary. Above 36% is risky, so avoid new credit until it drops.`);

  if (owing.length > 1) {
    tips.push(owing.some(d => d.apr > 0)
      ? `Avalanche: pay minimums on all, put every extra peso on ${orderDebts(owing, 'avalanche')[0].name} (highest interest). It saves the most.`
      : `Snowball: clear ${orderDebts(owing, 'snowball')[0].name} first (smallest balance) for a quick win, then roll that payment into the next.`);
  }
  if (owing.length && free > 0) {
    const base = payoffPlan(owing, 0, 'avalanche').months;
    const boosted = payoffPlan(owing, free, 'avalanche').months;
    if (Number.isFinite(boosted) && boosted < base) {
      tips.push(`Adding your free ${peso(free)}/mo to debts makes you debt-free in ${boosted} months instead of ${Number.isFinite(base) ? base : 'never'}.`);
    }
  }
  if (!owing.length && free > 0) {
    tips.push(`No debts, nice! Save at least ${peso(salary * 0.2)}/mo (20%) and build an emergency fund of ${peso(avgExpenses * 3)} (3 months of spending).`);
  }
  if (topCategory && topCategory.share > 0.3) {
    tips.push(`${topCategory.name} is ${Math.round(topCategory.share * 100)}% of your spending. Set a budget for it.`);
  }
  if (!tips.length) tips.push('You’re on track. Keep logging expenses so I can spot changes early.');
  return tips;
}
