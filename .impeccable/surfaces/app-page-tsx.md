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
| Cashflow | short bar history with selectable period | semantic buttons + CSS bars; no raster |
| Renewal arc | single open circular arc with three indexed due markers aligned to three indexed date rows | inline SVG geometry plus semantic text; mobile retains the same chart type |
| Subscription rows | three rows on overview, complete list in its tab | semantic HTML + service monograms |
| Transactions | newest-first compact rows and filters | semantic list + Phosphor icons |
| Forms | add transaction and add subscription | accessible dialog on desktop, bottom sheet on mobile |
| Motion | short press, dialog and tab transitions that communicate state change | CSS transforms/opacity with reduced-motion fallback |

## Constraints and open decisions

- Demo data is explicitly labeled; no commercial claims or real-user evidence is fabricated.
- The first release uses in-memory demo state. Authentication and durable cloud persistence remain open product decisions.
- Neumorphic depth may not carry meaning by itself; text, icons and focus outlines must remain legible in bright mobile conditions.
- `Tally` is the confirmed product name and is never localized.
- English (`en`) is the default interface; Vietnamese (`vi`) must provide complete copy and equivalent accessible names without changing the information architecture.
