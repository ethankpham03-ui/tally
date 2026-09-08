---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/layout.tsx","app/globals.css","app/manifest.ts"]
---

# Tally app shell

## Scope and mode

- Primary target: `app/page.tsx`
- Related targets: `app/layout.tsx`, `app/globals.css`, `app/manifest.ts`
- Mode: Operate
- Primary surface: mobile web at 360-430px; desktop is an expanded work surface.

## Audience, job and task

An individual checks available balance, records a transaction, and sees which paid apps renew next. A recruiter should also be able to discover real interactions without setup. The default-English primary action is `Add transaction` (`Thêm giao dịch` in Vietnamese); subscription management is the product-specific proof.

## Approved direction

- Direction: Reference-faithful Premium Neumorphism UI; no fixed Minimalism/Neumorphism ratio.
- Approved comp: `.impeccable/mocks/dashboard-minimal-neumorphism.png`
- Approval: the user explicitly replaced the prior ratio and approved the supplied dashboard reference as visual authority on 2026-08-28.
- Brand note: the approved comp predates the Tally identity; it remains composition evidence, not authority for the product name or mark.
- Memorable moment: the calm renewal arc connects three upcoming charges to the monthly subscription total without turning the dashboard into a mechanical cockpit.

## Responsive composition

- Mobile: compact header, one balance surface, two summary figures, scroll-safe cashflow chart, a compact circular renewal visual with three indexed dates, bottom navigation, and bottom-sheet forms. Touch targets are at least 44px.
- Desktop: fixed side navigation, left financial overview, right subscription column, and modal forms.
- No horizontal page scrolling from 320px upward. Dense secondary content moves to its own tab rather than shrinking.

## Visual inventory sampled from the comp

| Ingredient | Record | Implementation medium |
| --- | --- | --- |
| Page ground | sampled pearl grey `#F0F1F4` | CSS token |
| Raised surface | sampled near-white `#FBFBFD` | CSS token |
| Primary ink | cool graphite `#111B31` | CSS token |
| Secondary ink | sampled cool grey `#515A6E` | CSS token |
| Accent | sampled cobalt range `#166DFA` to `#2C76F4` | CSS token; one accent family only |
| Brand mark | canonical Tally wave icon at `public/tally-icon.png` | one locked raster asset across app and platform metadata |
| Language | English default; complete Vietnamese alternate | one locale state at a time; never mixed inline |
| Elevation | crisp 1px upper-left white lip and lower-right cool-grey rim, followed by broad directional shadow lobes | CSS shadow tokens on panels, controls, tabs, and subscription previews |
| Inset state | one inner-shadow pair for fields, pressed states, and intentionally recessed surfaces | CSS inset shadow |
| Corner language | panels 20px desktop / 16px mobile; controls 12px; small service marks 10px | CSS radii |
| Type ramp | 12px meta, 14px body, 16-18px labels, 28px mobile balance, 42-52px desktop balance | semantic CSS classes |
| Navigation | four core destinations plus settings as secondary | Phosphor icons + semantic buttons |
| Balance and summaries | one dominant number, two quiet supporting metrics | semantic HTML/CSS |
| Cashflow | Approved dual-wave template: 31 days, today centered with 15 days before and after; gross income above and gross spending below one zero baseline | shape-preserving SVG curves and translucent fills, exact positive daily amounts, passive horizontal scroll, normally 68px day slots; no totals, visible footnotes, selection, highlight or tooltip |
| Renewal arc | single open circular arc with three indexed due markers aligned to three indexed date rows | inline SVG geometry plus semantic text; mobile retains the same chart type |
| Subscription rows | three rows on overview, complete list in its tab | semantic HTML + service monograms |
| Transactions | newest-first compact rows and filters | semantic list + Phosphor icons |
| Forms | add/edit transaction, subscription and budget; local-data settings | accessible dialog on desktop, bottom sheet on mobile |
| Motion | short press, dialog and tab transitions that communicate state change | CSS transforms/opacity with reduced-motion fallback |

## Constraints and open decisions

- Demo data is generated relative to the current date and can be restored explicitly; no commercial claims or real-user evidence is fabricated.
- The first release is explicitly device-local. It stores one versioned finance record in browser storage, persists locale and theme, and supports JSON backup/restore. It has no authentication, account profile, server write, or cloud sync; the app shell must not imply otherwise with an avatar or account affordance.
- Balance, monthly totals, budget usage and cashflow are derived from the transaction ledger. Subscription forecasts enter that ledger only after the user explicitly records a payment.
- Destructive local-data actions require confirmation; row deletion offers Undo.
- Neumorphic depth may not carry meaning by itself; text, icons and focus outlines must remain legible in bright mobile conditions.
- `Tally` is the confirmed product name and is never localized.
- English (`en`) is the default interface; Vietnamese (`vi`) must provide complete copy and equivalent accessible names without changing the information architecture.

## Approved cashflow replacement — 2026-09-08

The user approved `public/research/tally-chart-wave.html` with “ok ổn á. sử dụng template này đi”. Visual references are `.impeccable/review/chart-wave-desktop.png` and `.impeccable/review/chart-wave-mobile.png`. Earlier bar, folded-sheet and stepped-terrain proposals are superseded for this component.

Keep only the title, VND, plain Income/Spending labels, each full date's short label and its two positive exact amounts, and plain Today text. Mint upper and rose lower curves with area fades carry the dark appearance; a pale mint/rose surface and darker marks adapt the same geometry to light mode. The shared linear scale spans the entire window and curves may not overshoot daily anchors. Future dates without entered transactions remain gaps. A day with missing conversion has no exact total for that affected series: show a dash and gap with an accessible explanation, rather than claiming zero or a complete partial total. Refunds remain separate ledger entries and do not reduce gross spending. Labels avoid adjacent curve slopes; exceptionally long amounts widen only their own day slots. Renders and ledger updates preserve the user's reading position; opening on a new calendar date centers today.

## Date and amount conventions

The chart's scrollable content starts at the first day and ends at the last day of the 31-day window. Center today through the initial scroll position, never with empty padding at either end. All displayed day/month dates use `dd/mm` in both English and Vietnamese; full dates and date entry use `dd/mm/yyyy`. A native calendar picker remains available beside the day-first text field.

Money entry uses dot thousands separators as the user types (`900000` → `900.000`) in both languages. Decimal currencies use a comma for the fractional part (`1.234,56`). Inputs retain plain canonical decimal strings for existing financial parsing; formatting never changes minor units or precision. The convention covers transactions, conversions, original merchant amounts, subscription payments and prices, budgets, balances, card limits/statements, transfers/fees, onboarding and exchange-rate entry.
