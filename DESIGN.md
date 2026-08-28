---
name: Tally
description: "A premium sculpted finance system with clear tactile contours and immediately legible data."
colors:
  accent: "#176dfa"
  accent-strong: "#0c5ee5"
  accent-soft: "#dbe8ff"
  canvas: "#eef1f5"
  surface: "#f4f6f9"
  surface-solid: "#fcfdff"
  surface-inset: "#e7ebf0"
  ink: "#111b31"
  muted: "#515a6e"
  positive: "#18834e"
  negative: "#cf3f48"
  warning: "#9b6500"
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
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "clamp(21px, 2vw, 28px)"
    fontWeight: 720
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "11px"
    fontWeight: 650
  field:
    fontFamily: "Geist, Helvetica Neue, sans-serif"
    fontSize: "16px"
    fontWeight: 400
rounded:
  selected: "8px"
  mark: "10px"
  inset: "11px"
  control: "12px"
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
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
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
    backgroundColor: "restrained cobalt bevel gradient"
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

Tally feels like a calm current shaped into premium tactile surfaces: a pearl-grey field, crisp directional highlight-and-shadow contours, graphite type, and cobalt action. The approved reference determines the material expression; there is no fixed Minimalism/Neumorphism ratio.

The system favors immediate financial legibility, explicit states, generous breathing room, and clearly sculpted panel edges. Depth never carries meaning by itself. Mobile web sets the default density and touch behavior, while wider layouts add working room without shrinking controls.

**Key Characteristics:**

- Pearl-grey ground with near-white material surfaces.
- One cobalt action family with restrained semantic color.
- Sculpted directional depth: a crisp white upper-left lip and cool grey lower-right rim precede the wider shadow lobes.
- Graphite Geist typography with tabular financial numerals.
- Quiet divider-led rows and at least 44px mobile targets.
- Surface corners at 16–20px; controls at 12px.
- One canonical Tally wave mark from `public/tally-icon.png`.
- Complete English and Vietnamese interfaces, with English as the default.

## Brand & Language

- **Name:** Tally is the fixed one-word English product name. Do not translate or transliterate it.
- **Canonical icon:** Use `public/tally-icon.png` (served as `/tally-icon.png`) unchanged in the app shell, browser metadata, install surfaces, and future branded imagery.
- **Icon color:** The icon's baked-in teal wave is a locked brand signature. Cobalt remains the interaction accent; do not sample extra interface colors from the icon.
- **Language model:** English (`en`) is the default locale and Vietnamese (`vi`) is a complete alternate locale. A language switch changes the full interface instead of showing both languages together.
- **Locale behavior:** Keep information hierarchy, control dimensions, and meaning stable across locales; update document language, accessible names, date labels, and copy as one coherent locale state.
- **Identity model:** Tally is local-only and has no sign-in, account profile, or cloud identity. Do not place avatars or account affordances in the app shell.

## Colors

The palette combines cool neutrals with one interaction accent and restrained financial-state colors.

### Primary

- **Current Cobalt:** Primary actions, active navigation, selected segments, focus, and sparse emphasis.
- **Deep Current:** Hover treatment for cobalt actions.
- **Cobalt Haze:** Soft icon, callout, and selected-context backgrounds.

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

Dark mode remaps the same semantic CSS custom properties; reusable components must not hard-code the light palette.

**The One Current Rule.** Cobalt marks primary action, selection, active navigation, and focus; do not introduce a second brand accent.

## Typography

**Display Font:** Geist (with Helvetica Neue and sans-serif fallbacks)  
**Body Font:** Geist (with Helvetica Neue and sans-serif fallbacks)

**Character:** Compact and contemporary, with enough weight for trust but no ornamental display face. Financial numerals use tabular spacing.

### Hierarchy

- **Display** (710, responsive 38–58px desktop / 31–40px mobile, 1): Balances and dominant totals.
- **Headline** (720, responsive 21–28px): Page greeting or primary title.
- **Title** (700, 16px): Card and section headings.
- **Body** (400, 13px, 1.55): Short guidance and contextual copy.
- **Label** (650, 11px): Metadata, controls, badges, and supporting values.
- **Field** (400, 16px): Text and numeric input without mobile zoom.

**The Numerals Lead Rule.** Financial values use tabular numerals and tighter tracking; labels remain compact and visually subordinate.

## Layout

Spacing is anchored to 4, 8, 12, 16, 24, and 32px. Mobile uses 16px gutters, tightening to 14px below 370px, and supports the full experience from 320px without horizontal page scrolling. At 769px and above, layouts gain working space; at 1180px the sidebar compacts before content is compressed. The desktop workspace is fluid up to 1540px.

**The Mobile Density Rule.** Mobile establishes the default touch size and reading order; larger screens add space, not smaller controls.

## Elevation & Depth

Depth follows the approved reference. Raised panels use a crisp one-pixel directional exterior contour plus broad upper-left highlight and lower-right shadow lobes; compact controls use the same geometry at smaller scale. Inset treatment is reserved for genuinely recessed fields and pressed states.

### Shadow Vocabulary

- **Raised:** -1px -1px white lip, 1px 1px cool-grey rim, then -10px -10px / 10px 12px highlight-and-shadow lobes; tightened below 768px.
- **Control:** the same directional lips with -5px -5px / 6px 7px compact lobes.
- **Inset:** inset 3px 3px 8px cool-grey and inset -3px -3px 8px white, plus a faint internal rim.

**The Contour Rule.** Every primary panel and raised control must retain a visible exterior lip against the canvas; never substitute a centered neutral blur that dissolves the edge.

**The Meaning Before Material Rule.** State must remain clear through text, color, or focus treatment when shadows are removed.

## Shapes

Panels use softly rounded 20px corners on desktop and 16px on mobile. Controls use 12px corners; compact marks and row icons use 10px; inset groups use 11px with 8px selected segments. Pills use a full radius. Mobile sheets become edge-to-edge rather than placing a rounded panel inside a small viewport.

## Components

### Buttons

- **Shape:** Compact tactile controls (12px radius) with a 46px minimum height.
- **Primary:** White text on a restrained cobalt bevel gradient with 18px horizontal padding, a directional lip, and a compact accent shadow.
- **Hover / Focus:** Deep cobalt on hover; a 3px cobalt-mixed outline with visible offset on keyboard focus; scale to 0.98 on press.
- **Secondary:** Graphite on Cloud Surface with the compact control shadow.

### Chips

- **Style:** Metadata pills use a full radius and quiet tint. Segmented controls sit in an 11px raised tray with a clear exterior contour and 8px selections.
- **State:** Selected segments use the restrained cobalt bevel and white text; unselected choices remain muted and flat inside the raised tray.

### Cards / Containers

- **Corner Style:** 20px desktop and 16px mobile.
- **Background:** Cloud Surface over Pearl Ground.
- **Shadow Strategy:** One directional 1px exterior lip plus the paired upper-left highlight and lower-right shadow lobes.
- **Border:** No separate flat border; the directional shadow lip supplies the visible contour. Use hairlines only between flat data rows.
- **Internal Padding:** Usually 24px desktop and 18px mobile.

### Inputs / Fields

- **Style:** White Field background, quiet 1px border, 12px radius, 50px desktop / 52px mobile height.
- **Focus:** Cobalt border plus a 3px visible outline.
- **Error:** Charge Red border and explicit helper copy.

### Navigation

Desktop items are 52px-high raised controls with cobalt bevel active states. Mobile destinations retain at least 44px targets; active state uses both cobalt color and aria-current. The central mobile action is a 54px cobalt control.

### Quiet Rows

Transaction rows remain flat inside their parent surface and use a single hairline. Subscription previews on the overview are raised controls matching the reference; labels and metadata yield to tabular values, and leading marks use restrained 10px corners.

## Do's and Don'ts

### Do:

- **Do** keep the page ground pearl-grey and place primary content on near-white surfaces.
- **Do** reserve cobalt for the primary action, active destination, selected segment, focus, and sparse emphasis.
- **Do** use tabular numerals for balances, amounts, dates, and percentages.
- **Do** keep mobile tap targets at least 44px and preserve the 320px no-horizontal-scroll floor.
- **Do** pair positive, negative, and warning color with explicit copy or labels.
- **Do** use the canonical Tally icon without redrawing, recoloring, or adding a competing shadow treatment.
- **Do** treat English and Vietnamese as complete, equivalent interface states; English is the initial state.
- **Do** preserve the reference-faithful exterior contour on panels, tabs, secondary controls, and subscription preview rows in both themes.

### Don't:

- **Don't** use shadow alone to communicate selection, status, validation, or interactivity.
- **Don't** blur a raised surface into the canvas with a centered halo or remove its directional one-pixel lip.
- **Don't** introduce gradients outside the restrained cobalt bevel and subtle directional surface shading defined by this system.
- **Don't** compress rows or controls to fit more finance data into the first view.
- **Don't** promote page-specific charts, renewal geometry, or dashboard column arrangements into global component rules.
- **Don't** reuse the former product name or the retired bar/tile marks on any active surface.
- **Don't** mix English and Vietnamese copy in the same locale state.
