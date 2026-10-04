// Paws Color Palette — light + dark, all text pairs WCAG AA (≥ 4.5:1).
// `Colors` is a live view of the active palette: read it during render (or inside `themed()` styles)
// and it follows the System / Light / Dark setting. See components/theme.tsx.

export type Scheme = 'light' | 'dark';

const shared = {
  gold: '#E6A817',          // Accent / highlight
  brandPurple: '#A78BFA',   // Gradient mid-stop, splash bg (same in both modes)
  ink: '#1F2937',           // Dark text on the purple splash / light login hero
  white: '#FFFFFF',         // Literal white (login hero only); use `surface` for cards

  // Account type colors
  cash: '#4CAF50',
  bank: '#2196F3',
  credit_card: '#9C27B0',
  loan: '#FF5722',
  investment: '#FF9800',

  // Category colors (default palette)
  categoryColors: [
    '#E53935', '#D81B60', '#8E24AA', '#5E35B1',
    '#1E88E5', '#039BE5', '#00897B', '#43A047',
    '#F4511E', '#FB8C00', '#FDD835', '#6D4C41',
  ],
};

export const light = {
  ...shared,
  primary: '#2563EB',       // Bright blue (5.2:1 with white)
  onPrimary: '#FFFFFF',     // Text/icons on primary or semantic-color fills
  primaryLight: '#3B82F6',
  primaryDark: '#1E40AF',
  primaryBg: '#EFF6FF',     // Soft blue tint card

  income: '#047857',
  expense: '#DC2626',
  transfer: '#2563EB',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',

  surface: '#FFFFFF',       // Cards, sheets, tab bar
  cardBg: '#FFFFFF',
  offWhite: '#F8FAFC',      // Inputs, inset fields
  screenBg: '#F8FAFC',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',     // 4.55:1 on screenBg
};

export const dark: typeof light = {
  ...shared,
  primary: '#60A5FA',       // Lighter blue reads on dark (6.7:1 on surface)…
  onPrimary: '#0B1220',     // …so text on it is dark (7.4:1)
  primaryLight: '#3B82F6',
  primaryDark: '#93C5FD',
  primaryBg: '#15233F',

  income: '#34D399',
  expense: '#F87171',
  transfer: '#60A5FA',
  successBg: '#0F2A22',
  successBorder: '#1F5C46',

  surface: '#131C2E',
  cardBg: '#131C2E',
  offWhite: '#1B2539',
  screenBg: '#0B1220',
  border: '#26324A',
  textPrimary: '#E5E7EB',
  textSecondary: '#A3B0C2',
  textMuted: '#8A97AB',
};

let active: typeof light = light;
let activeScheme: Scheme = 'light';

export function setScheme(s: Scheme) {
  activeScheme = s;
  active = s === 'dark' ? dark : light;
}
export const currentScheme = () => activeScheme;

/** Live palette: property reads always hit the active scheme. */
export const Colors = new Proxy({} as typeof light, { get: (_, key) => active[key as keyof typeof light] });

export default Colors;
