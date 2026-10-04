# Paws 🐾

> *Paws before you spend.*

An offline-first personal finance app for iOS and Android. Track accounts, log income, expenses and transfers, set monthly budgets, and get nudged before you overspend.

Built with Expo (SDK 52), React Native and Expo Router. Data lives on the device in SQLite; login goes through Supabase Auth.

## Features

- **Accounts:** cash, bank, credit card, loan and investment accounts, plus net worth.
- **Transactions:** income, expenses and transfers. Balances update the moment you save.
- **Budgets:** monthly limits per category with progress bars.
- **Notifications:** local only, no push server.
  - A daily 8pm reminder to log your spending.
  - An alert when an expense crosses 80% and again at 100% of a category budget.
- **Login:** Supabase email and password. Signed-out users are sent to the welcome screen.

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure Supabase

Create a `.env` in the project root (it's gitignored):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
```

Use the **publishable** key from Supabase → Project Settings → API Keys. It's meant to ship inside the app. Never put the secret or service-role key here.

Supabase requires email confirmation by default, so new users must click the link in their inbox before they can sign in. You can turn this off under Auth → Providers → Email.

### 3. Run

The app uses native modules (notifications, splash screen, SQLite), so it needs a development build. Expo Go won't work.

```bash
npx expo run:ios       # iOS Simulator
npx expo run:android   # Android emulator / device
```

Once the build is installed, `npx expo start` is enough for day-to-day JavaScript changes.

## Troubleshooting

| Problem | Fix |
|---|---|
| `pod install` crashes with `Unicode Normalization not appropriate for ASCII-8BIT` | Use a UTF-8 locale: `export LANG=en_US.UTF-8` (add it to `~/.zshrc`). |
| iOS build fails in `fmt/format-inl.h` under Xcode 26 | `ios/Podfile` builds the `fmt` pod as C++17. If you run `expo prebuild --clean`, re-add that `post_install` block. |
| `npm install` fails with `ERESOLVE` on `expo-linking` | Keep `expo-linking` at `~7.0.5` (the version matching SDK 52). |
| Login says "Check your email to confirm your account" | Confirm the email, or disable email confirmation in Supabase. |

## Brand assets

The cat mascot, app icon, splash and login hero art are all drawn in code:

```bash
python3 scripts/make-logo.py   # needs Pillow: pip3 install pillow
```

This writes the files in `assets/`. Rebuild natively afterwards (`npx expo run:ios`) so the new icon and splash are picked up.

Colors come from a single file, [`constants/Colors.ts`](constants/Colors.ts). Text colors there are tuned to meet the WCAG AA contrast minimum (4.5:1).

## Project layout

```
app/
  _layout.tsx          Root: auth provider, splash gate, DB provider, stack
  login.tsx            Welcome / sign in / sign up
  (tabs)/              Dashboard, Accounts, Log, Budgets
  modal/               Add transaction / account / budget
components/            AccountCard, BudgetBar, TransactionItem, AmountText
constants/             Colors, default categories
lib/
  auth.tsx             Supabase client + session context
  notifications.ts     Daily reminder + budget alerts
  db/                  SQLite schema, queries (web uses localStorage)
scripts/make-logo.py   Brand asset generator
```

## Notes

- **Your data stays on the device.** Supabase is used only for login; nothing syncs to the server yet.
- **Internal identifiers still say "gastador"** (database file `gastador.db`, bundle ID `com.gastador.app`) from the app's earlier name. Renaming the database would wipe existing users' data, and changing the bundle ID makes the stores treat it as a new app.
