---
name: Tally
description: "A premium sculpted finance system with clear tactile contours and immediately legible data."
colors:
  accent: "#00758a"
  accent-strong: "#005f70"
  accent-soft: "#d9f1f3"
  accent-gradient-start: "#007a8f"
  accent-hover-start: "#006f83"
  accent-hover-mid: "#00697c"
  accent-hover-end: "#005f70"
  canvas: "#eef1f5"
  surface: "#f4f6f9"
  surface-solid: "#fcfdff"
  surface-inset: "#e7ebf0"
  ink: "#111b31"
  muted: "#515a6e"
  positive: "#126b40"
  negative: "#b52e3a"
  warning: "#7a4a00"
  spectral-cyan: "oklch(54% 0.12 215)"
  spectral-violet: "oklch(54% 0.13 295)"
  spectral-coral: "oklch(54% 0.12 28)"
  service-green: "#0f7a4b"
  service-blue: "#266bb7"
  service-graphite: "#252c39"
  service-red: "#a72e39"
  service-violet: "#5a439a"
  dark-surface: "#1d2430"
  dark-surface-solid: "#252e3b"
  dark-surface-gradient-end: "#19202b"
  dark-control-start: "#28313f"
  dark-control-end: "#1a212c"
  dark-accent: "#76a3ff"
  dark-accent-strong: "#91b4ff"
  dark-accent-gradient-end: "#5d8fe9"
  dark-accent-hover-start: "#a1c0ff"
  dark-accent-hover-mid: "#83adff"
  dark-accent-hover-end: "#6797ef"
  line: "rgba(43, 56, 80, 0.1)"
typography:
  display:
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "clamp(38px, 4.5vw, 58px)"
    fontWeight: 710
    lineHeight: 1
    letterSpacing: "-0.04em"
  display-mobile:
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "clamp(31px, 9.6vw, 40px)"
    fontWeight: 710
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Be Vietnam Pro, Geist, Helvetica Neue, sans-serif"
    fontSize: "clamp(21px, 2vw, 28px)"
    fontWeight: 720
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Be Vietnam Pro, Geist, Helvetica Neue, sans-serif"
    fontSize: "16px"
    fontWeight: 680
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Be Vietnam Pro, Geist, Helvetica Neue, sans-serif"
    fontSize: "14px"
    fontWeight: 430
    lineHeight: 1.5
  control:
    fontFamily: "Be Vietnam Pro, Geist, Helvetica Neue, sans-serif"
    fontSize: "13px"
    fontWeight: 680
    lineHeight: 1.35
  label:
    fontFamily: "Be Vietnam Pro, Geist, Helvetica Neue, sans-serif"
    fontSize: "12px"
    fontWeight: 620
    lineHeight: 1.35
  meta:
    fontFamily: "Be Vietnam Pro, Geist, Helvetica Neue, sans-serif"
    fontSize: "11px"
    fontWeight: 430
    lineHeight: 1.35
  micro:
    fontFamily: "Be Vietnam Pro, Geist, Helvetica Neue, sans-serif"
    fontSize: "10px"
    fontWeight: 430
    lineHeight: 1.3
  service-mark:
    fontFamily: "Be Vietnam Pro, Geist, Helvetica Neue, sans-serif"
    fontSize: "15px"
    fontWeight: 720
  compact-value-min:
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "17px"
    fontWeight: 710
  mobile-section:
    fontFamily: "Be Vietnam Pro, Geist, Helvetica Neue, sans-serif"
    fontSize: "18px"
    fontWeight: 720
  mobile-app-title:
    fontFamily: "Be Vietnam Pro, Geist, Helvetica Neue, sans-serif"
    fontSize: "19px"
    fontWeight: 680
  metric-emphasis:
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "20px"
    fontWeight: 710
  mobile-page-heading:
    fontFamily: "Be Vietnam Pro, Geist, Helvetica Neue, sans-serif"
    fontSize: "22px"
    fontWeight: 720
  supporting-total:
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "24px"
    fontWeight: 710
  compact-total:
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "26px"
    fontWeight: 710
  compact-display-min:
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "27px"
    fontWeight: 710
  compact-display-max:
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "30px"
    fontWeight: 710
  renewal-count:
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "36px"
    fontWeight: 710
  field:
    fontFamily: "Be Vietnam Pro, Geist, Helvetica Neue, sans-serif"
    fontSize: "16px"
    fontWeight: 400
rounded:
  chart-bar: "4px"
  progress-bar: "5px"
  selected: "8px"
  compact-tile: "9px"
  mark: "10px"
  inset: "11px"
  control: "12px"
  compact-panel: "14px"
  panel-mobile: "16px"
  panel-desktop: "20px"
  full: "999px"
spacing:
  micro: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
motion:
  press: "110ms"
  feedback: "160ms"
  state: "180ms"
  surface: "260ms"
  viewEnter: "220ms"
  viewExit: "120ms"
  toast: "180ms"
  enterEasing: "cubic-bezier(0.16, 1, 0.3, 1)"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "46px"
  card-raised:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel-desktop}"
    padding: "{spacing.lg}"
  input-field:
    backgroundColor: "{colors.surface-solid}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "50px"
  segment-container:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.inset}"
    padding: "{spacing.micro}"
  segment-item:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.selected}"
    padding: "0 13px"
    height: "34px"
  segment-item-active:
    backgroundColor: "restrained logo-teal bevel gradient"
    textColor: "#ffffff"
  nav-item:
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "52px"
  nav-item-active:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
---

# Design System: Tally

## Overview

**Creative North Star: "The Quiet Current"**

Tally feels like a calm current shaped into premium tactile surfaces: a pearl-grey field, crisp directional highlight-and-shadow contours, graphite type, and logo-teal action. The approved reference determines the material expression; there is no fixed Minimalism/Neumorphism ratio.

The system favors immediate financial legibility, explicit states, generous breathing room, and clearly sculpted panel edges. Depth never carries meaning by itself. Mobile web sets the default density and touch behavior, while wider layouts add working room without shrinking controls.

**Key Characteristics:**

- Pearl-grey ground with near-white material surfaces.
- One logo-teal action family in the light theme, restrained semantic color, and a rank-bound spectral visualization trio.
- Sculpted directional depth: a crisp white upper-left lip and cool grey lower-right rim precede the wider shadow lobes.
- Graphite Be Vietnam Pro interface typography with Geist tabular financial numerals.
- Quiet divider-led rows and at least 44px mobile targets.
- Surface corners at 16–20px; controls at 12px.
- One canonical Tally wave mark, served from the optimized `public/tally-icon-192.png` asset in the app shell.
- Complete English and Vietnamese interfaces, with English as the default.

## Brand & Language

- **Name:** Tally is the fixed one-word English product name. Do not translate or transliterate it.
- **Canonical icon:** `public/tally-icon.png` remains the source artwork. Use the visually identical optimized `public/tally-icon-192.png` in the app shell and browser metadata; reserve the larger variants for install and branded imagery that need them.
- **Icon color:** The icon's baked-in teal wave is a locked brand signature. The light-theme interaction family is sampled from that wave, then darkened enough to keep white text above WCAG AA. The dark theme keeps its separate accessible blue treatment.
- **Language model:** English (`en`) is the default locale and Vietnamese (`vi`) is a complete alternate locale. A language switch changes the full interface instead of showing both languages together.
- **Locale behavior:** Keep information hierarchy, control dimensions, and meaning stable across locales; update document language, accessible names, date labels, and copy as one coherent locale state.
- **Identity model:** Tally is local-only and has no sign-in, account profile, or cloud identity. Do not place avatars or account affordances in the app shell.

## Colors

The palette combines cool neutrals with one interaction accent and restrained financial-state colors.

### Primary

- **Tally Teal:** Primary actions, active navigation, selected segments, focus, and sparse emphasis in the light theme.
- **Deep Current:** Hover treatment for Tally Teal actions.
- **Current Mist:** Soft icon, callout, and selected-context backgrounds.

### Neutral

- **Pearl Ground:** The continuous page canvas.
- **Cloud Surface:** Raised panels and secondary controls.
- **White Field:** Inputs and places requiring cleaner separation.
- **Recessed Mist:** Inset controls and search surfaces.
- **Graphite Ink:** Headlines, balances, and primary values.
- **Cool Slate:** Supporting copy, labels, and inactive controls.
- **Hairline Graphite:** Quiet row dividers and field borders.

### Semantic States

- **Ledger Green:** Income and healthy positive state.
- **Charge Red:** Expense, error, and exceeded state.
- **Budget Amber:** Approaching-limit warning state.

### Spectral Visualization

- **Current Cyan:** The next upcoming renewal (rank 1).
- **Quiet Violet:** The second upcoming renewal (rank 2).
- **Soft Coral:** The third upcoming renewal (rank 3).
- These colors may appear only on the renewal visualization, its numbered key, and a low-alpha static data glow. Visible rank numbers and ordered placement remain the primary redundant cue.
- Light mode uses deeper cores with white index text; dark mode uses brighter cores with graphite index text. The colors are authored in OKLCH with tested sRGB fallbacks.

Dark mode remaps the same semantic CSS custom properties; reusable components must not hard-code the light palette.

**The One Current Rule.** Tally Teal marks primary action, selection, active navigation, and focus in the light theme; do not introduce a second brand accent.

**The Spectral Boundary Rule.** Cyan, violet, and coral are visualization auxiliaries, never interaction or semantic accents. They never replace Tally Teal, Ledger Green, Charge Red, or Budget Amber.

## Typography

**Interface Font:** Be Vietnam Pro (with Geist, Helvetica Neue, and sans-serif fallbacks)

**Financial Numerals:** Geist (with Helvetica Neue and sans-serif fallbacks)

**Character:** Contemporary and distinctly legible in both Vietnamese and English, with enough weight for trust but no ornamental display face. Financial numerals stay compact and use tabular spacing. Interface copy uses real 400, 600, and 700 weights; editorial emphasis may use the bundled italic cuts instead of synthesized italics.

### Hierarchy

- **Display** (710, responsive 38–58px desktop / 31–40px mobile, 1): Balances and dominant totals.
- **Headline** (720, responsive 21–28px, 1.1): Page greeting or primary title.
- **Title** (680, 16px, 1.25): Card and section headings.
- **Body** (430, 14px, 1.5): Guidance and contextual copy.
- **Control** (680, 13px, 1.35): Primary and secondary button labels.
- **Label** (620, 12px, 1.35): Controls, badges, row titles, and supporting values.
- **Meta** (430, 11px, 1.35): Secondary dates, statuses, and helper copy. Ten pixels is reserved for chart ticks or constrained duplicate labels.
- **Field** (400, 16px): Text and numeric input without mobile zoom.

**The Numerals Lead Rule.** Financial values use tabular numerals and tighter tracking; labels remain compact and visually subordinate.

## Layout

Spacing is anchored to 4, 8, 12, 16, 24, and 32px. The mobile/tablet shell uses 16px gutters, tightening to 14px below 370px, and supports the full experience from 320px without horizontal page scrolling. Components enter their phone pressure layout at 430px, the tablet composition runs from 600–900px, and the desktop sidebar begins above 900px. Coarse-pointer phone landscape up to 1024px also keeps the mobile shell when height is 520px or less. The desktop workspace is fluid up to 1540px.

Safe-area insets are part of the layout contract: the sticky app bar, workspace gutters, bottom navigation, sheets, and toast respect all four edges under `viewport-fit=cover`. Financial values never wrap in the middle of a number; compact screens change composition first, and exceptional safe-integer magnitudes use the explicit compact-money treatment with the full value retained in text and `title`.

**The Mobile Density Rule.** Mobile establishes the default touch size and reading order; larger screens add space, not smaller controls.

## Elevation & Depth

Depth follows the approved reference. Raised panels use a crisp one-pixel directional exterior contour plus broad upper-left highlight and lower-right shadow lobes; compact controls use the same geometry at smaller scale. Inset treatment is reserved for genuinely recessed fields and pressed states.

### Shadow Vocabulary

- **Raised:** -1px -1px white lip, 1px 1px cool-grey rim, then -10px -10px / 10px 12px highlight-and-shadow lobes; tightened in the mobile/tablet shell.
- **Control:** the same directional lips with -5px -5px / 6px 7px compact lobes.
- **Inset:** inset 3px 3px 8px cool-grey and inset -3px -3px 8px white, plus a faint internal rim.

**The Contour Rule.** Every primary panel and raised control must retain a visible exterior lip against the canvas; never substitute a centered neutral blur that dissolves the edge.

**The Meaning Before Material Rule.** State must remain clear through text, color, or focus treatment when shadows are removed.

## Shapes

Panels use softly rounded 20px corners on desktop and 16px on mobile. Controls use 12px corners; compact marks and row icons use 10px; inset groups use 11px with 8px selected segments. Pills use a full radius. Phone sheets become edge-to-edge; the 600–900px tablet tier restores a bounded centered sheet and two-column fields.

## Motion

Motion communicates hierarchy and state without changing the material language. Press feedback completes in 110ms and local state changes in 160–180ms. Navigation uses a bidirectional content plane keyed to the canonical tab order: the outgoing view clears in 120ms and the incoming view settles in 220ms. Sheets use a 260ms surface entrance with a faster backdrop fade; toasts use a compact 180ms entrance and a faster exit. Spatial entrances use the shared exponential ease-out; controls use a quieter standard curve.

Motion for React owns stateful presence transitions (views, sheets, and toasts) through `LazyMotion` with `domAnimation`; CSS continues to own simple color, hover, theme-icon, loading-current, and press feedback. Do not animate blur, large shadows, or layout geometry during navigation.

The initial local-data and locale hydration state renders a geometry-matched shell instead of sample values. On mobile it matches the three-control app bar, balance → renewal → cashflow → activity order, and bottom navigation footprint. The shell never imposes a minimum delay. Its bounded surface current and status spinner stop under reduced motion, while the static geometry and explicit loading copy remain.

Reduced-motion mode removes spatial movement while preserving brief color and opacity feedback. Reduced-transparency mode makes sticky navigation and overlays opaque. High-contrast and forced-colors modes replace shadow-only contours with explicit borders and system focus colors.

## Iconography

Phosphor is the only interface and expense-category icon family. Use 20–21px icons for navigation and shell controls, 18px for inline actions, and 16px for compact badges/carets while retaining 44–48px hit targets. Subscription services use locally bundled Simple Icons brand marks or an unmodified verified official app asset where available, with the existing Tally monogram tile as a neutral fallback.

- Inactive navigation uses `regular`; active navigation uses `fill` together with `aria-current` and the interaction accent treatment.
- Passive page, field, category, and callout icons use `regular`.
- CTA, edit, delete, close, and icon-only controls use `bold`.
- Empty-state, hero, and privacy illustrations may use `duotone`.
- Critical warning/status icons use `fill` and always sit beside explicit copy.
- Decorative SVG icons are hidden from assistive technology; the containing control owns the accessible name.

## Components

### Buttons

- **Shape:** Compact tactile controls (12px radius) with a 46px minimum height.
- **Primary:** White text on a restrained logo-teal bevel gradient with 18px horizontal padding, a directional lip, and a compact accent shadow.
- **Hover / Focus:** Deep Current on hover; a solid 3px focus-ring token with visible offset on keyboard focus; scale to 0.98 on press.
- **Secondary:** Graphite on Cloud Surface with the compact control shadow.

### Chips

- **Style:** Metadata pills use a full radius and quiet tint. Segmented controls sit in an 11px raised tray with a clear exterior contour and 8px selections.
- **State:** Selected segments use the restrained logo-teal bevel and white text; unselected choices remain muted and flat inside the raised tray.

### Cards / Containers

- **Corner Style:** 20px desktop and 16px mobile.
- **Background:** Cloud Surface over Pearl Ground.
- **Shadow Strategy:** One directional 1px exterior lip plus the paired upper-left highlight and lower-right shadow lobes.
- **Border:** No separate flat border; the directional shadow lip supplies the visible contour. Use hairlines only between flat data rows.
- **Internal Padding:** Usually 24px desktop and 18px mobile.

### Inputs / Fields

- **Style:** White Field background, quiet 1px border, 12px radius, 50px desktop / 52px mobile height.
- **Focus:** Interaction-accent border plus a 3px visible outline.
- **Error:** Charge Red border and explicit helper copy.

### Navigation

Desktop items are 52px-high raised controls with interaction-accent bevel active states. Mobile destinations retain at least 44px targets; active state uses the interaction accent, a filled Phosphor icon, and `aria-current`. Every label owns the same two-line block so English and Vietnamese keep a stable icon baseline. The central mobile action is a 54px interaction-accent control.

### Mobile Data Rows

At 430px and below, transaction actions move to a dedicated second row so identity and amount keep a readable first row. Renewal destinations are at least 44px tall. Budget rows retain their remaining/over-by copy, meter, and edit actions instead of hiding meaning to save height. From 600–900px, balance and renewals pair into a tablet grid while cashflow and activity span the full width.

### Destructive Feedback

Destructive row changes expose an Undo toast until the user explicitly undoes or dismisses it; recovery is never removed by a short timer. Settings confirmations are inline disclosure groups: focus moves to the least-destructive action, Escape cancels the disclosure before it closes Settings, and cancelling restores the original trigger.

### Quiet Rows

Transaction rows remain flat inside their parent surface and use a single hairline. Subscription previews on the overview are raised controls matching the reference; labels and metadata yield to tabular values, and leading marks use restrained 10px corners.

## Do's and Don'ts

### Do:

- **Do** keep the page ground pearl-grey and place primary content on near-white surfaces.
- **Do** reserve Tally Teal in the light theme for the primary action, active destination, selected segment, focus, and sparse emphasis.
- **Do** use tabular numerals for balances, amounts, dates, and percentages.
- **Do** keep mobile tap targets at least 44px and preserve the 320px no-horizontal-scroll floor.
- **Do** pair positive, negative, and warning color with explicit copy or labels.
- **Do** use the canonical Tally icon without redrawing, recoloring, or adding a competing shadow treatment.
- **Do** treat English and Vietnamese as complete, equivalent interface states; English is the initial state.
- **Do** preserve the reference-faithful exterior contour on panels, tabs, secondary controls, and subscription preview rows in both themes.
- **Do** keep spectral rank color redundant with visible numbers and ordered placement.
- **Do** keep loading/saving feedback explicit without blocking the usable app during local persistence.

### Don't:

- **Don't** use shadow alone to communicate selection, status, validation, or interactivity.
- **Don't** blur a raised surface into the canvas with a centered halo or remove its directional one-pixel lip.
- **Don't** introduce gradients outside the restrained interaction-accent bevel, directional surface shading, bounded loading current, or rank-bound renewal visualization defined by this system.
- **Don't** use spectral color on buttons, selected tabs, navigation, focus, validation, or financial semantic states.
- **Don't** compress rows or controls to fit more finance data into the first view.
- **Don't** promote page-specific charts, renewal geometry, or dashboard column arrangements into global component rules.
- **Don't** reuse the former product name or the retired bar/tile marks on any active surface.
- **Don't** mix English and Vietnamese copy in the same locale state.
