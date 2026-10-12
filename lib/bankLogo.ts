/**
 * Paws — guess a bank / e-wallet from an account's name ("BDO Savings", "My Maya", "GCash wallet").
 * Returns a key into components/AccountIcon's logo map, or null to keep the account's own icon.
 */
const BANKS: [key: string, pattern: RegExp][] = [
  ['bdo', /\bbdo\b|banco de oro/],
  ['bpi', /\bbpi\b|bank of the philippine islands/],
  ['metrobank', /metro ?bank/],
  ['landbank', /land ?bank/],
  ['unionbank', /union ?bank/],
  ['securitybank', /security ?bank|\bsecbank\b/],
  ['rcbc', /\brcbc\b/],
  ['pnb', /\bpnb\b|philippine national bank/],
  ['chinabank', /china ?bank|\bcbc\b/],
  ['eastwest', /east ?west/],
  ['psbank', /\bps ?bank\b/],
  ['gcash', /\bg-?cash\b/],
  ['maya', /\b(pay)?maya\b/],
  ['gotyme', /go ?tyme/],
  ['seabank', /sea ?bank|mari ?bank/],
  ['cimb', /\bcimb\b/],
  ['tonik', /\btonik\b/],
];

export type BankKey = (typeof BANKS)[number][0];

/** Names can mention two brands ("Maya / GCash", the seeded default): the one written first wins. */
export function bankFromName(name: string): BankKey | null {
  const n = name.toLowerCase();
  let best: { key: BankKey; at: number } | null = null;
  for (const [key, re] of BANKS) {
    const at = n.search(re);
    if (at >= 0 && (!best || at < best.at)) best = { key, at };
  }
  return best?.key ?? null;
}
