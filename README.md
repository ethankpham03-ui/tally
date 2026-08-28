# Tally

Tally is a local-first personal finance web app for tracking income, expenses, category budgets, and recurring subscriptions in one coherent ledger.

## What works

- Add, edit, search, filter, and remove transactions with Undo.
- Derive available balance, monthly totals, budget usage, and cash-flow charts from the transaction ledger.
- Add, edit, pause, and remove subscriptions.
- Record a subscription payment once per renewal occurrence and advance the next renewal safely.
- Handle overdue/today/upcoming renewal dates and month-end or leap-year recurrence.
- Add, edit, and remove monthly category budgets.
- Persist finance data, theme, and English/Vietnamese language preference on the device.
- Export and import a validated JSON backup; restore date-aware sample data or clear all data with confirmation.
- Use the complete responsive interface in light or dark Premium Neumorphism themes.

## Data model

Tally keeps one versioned finance document in browser storage. Transactions are the source of truth: balance, monthly income and spending, budget progress, and chart data are calculated rather than stored as competing totals. Subscription forecasts do not create expenses automatically; the user explicitly records each payment.

No account or server is involved, and financial data is not sent to a cloud service. Browser storage can be cleared by the browser or operating system, so the app includes portable JSON backups.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vinext.

## Quality checks

```bash
npm test
npm run lint
npm run build
```

The domain test suite covers ledger totals, month scoping, budgets, date-only arithmetic, recurrence, persistence validation, and idempotent subscription payments.

## Stack

React 19, TypeScript, Vinext/Vite, Phosphor Icons, and CSS design tokens. The build is Cloudflare-compatible, while the current product remains intentionally device-local.
