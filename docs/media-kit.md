# Tally media kit

Product banners and authentic screenshots for the Tally repository and portfolio. Updated **8 September 2026**, using the interface at commit [`56d1827`](https://github.com/ethankpham03-ui/tally/commit/56d18270aa62bfd1d572df466e5f4108cea21e3b).

[English README](../README.md) · [README tiếng Việt](../README.vi.md) · [Design system](../DESIGN.md)

## Promotional banners

Both banners show Tally on desktop and mobile. The pale blue-gray studio setting, teal accents, and soft physical surfaces follow the existing product identity.

| Banner | Preview / web asset | Original PNG | Dimensions |
| --- | --- | --- | --- |
| **Your money. In perspective.** | [WebP](./images/tally-hero.webp), 111 KiB | [Download PNG](./images/tally-hero.png) | 1672 × 941 |
| **Every account. Every day.** | [WebP](./images/tally-everyday.webp), 122 KiB | [Download PNG](./images/tally-everyday.png) | 1672 × 941 |

[![Tally hero banner with desktop monitor and smartphone](./images/tally-hero.webp)](./images/tally-hero.png)

[![Tally cash-flow and money-sources banner with laptop and smartphone](./images/tally-everyday.webp)](./images/tally-everyday.png)

The device compositions were created with the **built-in ImageGen tool**, using the original Tally icon and the app screenshots listed below as reference inputs. These are promotional renders; screen details may differ from the exact application. The original captures are the reference for product behavior and UI fidelity.

PNG masters are preserved as generated. The README uses quality-90 WebP conversions at the same dimensions; together they are approximately 234 KiB, about 92% smaller than the PNG masters. The [complete creative prompts](./media/banner-prompts.md) record each banner's copy, composition, and input images.

## Original app screenshots

All screenshots come from the current React application rendered in a fresh, isolated Chromium context using Playwright. No interface elements were redrawn or rearranged. Captures wait for fonts, app images, and chart layout to finish; reduced motion keeps them stable.

| Screenshot | View | Locale / theme | Pixel dimensions |
| --- | --- | --- | --- |
| [Desktop overview](./images/screenshots/desktop-overview.png) | Balances, sources, card debt, and renewal overview | English / light | 2880 × 2200 |
| [Desktop cash flow](./images/screenshots/desktop-cashflow.png) | Sources, daily income/spending waves, and recent transactions | English / light | 2880 × 2200 |
| [Desktop subscriptions](./images/screenshots/desktop-subscriptions.png) | Service list, renewal dates, and estimated subscription totals | English / light | 2880 × 2200 |
| [Mobile overview](./images/screenshots/mobile-overview.png) | Balance summary and bottom navigation | English / light | 780 × 1688 |
| [Mobile dark overview](./images/screenshots/mobile-dark.png) | Balance summary and bottom navigation | Vietnamese / dark | 780 × 1688 |
| [Mobile cash flow](./images/screenshots/mobile-cashflow-light.png) | Daily chart and recent transactions | English / light | 780 × 1688 |
| [Mobile money sources](./images/screenshots/mobile-accounts-dark.png) | Bank artwork, cash, card debt, and source ordering | Vietnamese / dark | 780 × 1688 |

Desktop viewport: **1440 × 1100 CSS pixels**. Mobile viewport: **390 × 844 CSS pixels**. Both use a device scale factor of 2 and the Asia/Bangkok timezone. Cash-flow and source-detail captures show the same overview page after scrolling. The capture sessions reported no page errors or horizontal document overflow.

## Illustrative data

Financial records are synthetic, created through the current finance domain APIs in an isolated browser session. They do not come from a personal ledger or a user backup. Example sources are a BIDV account, cash, and a Visa Platinum card, with varied daily income and spending; example subscriptions and budgets use the repository's demo fixture data. Account names are sample labels, not connected bank accounts.

The installed product starts without these sample records. Displayed service prices are examples from the source-linked catalog, not a live price quote. Separate desktop and mobile screenshots demonstrate responsive layouts, not automatic synchronization between devices.

## Refreshing the assets

1. Run the current checkout locally and use a new, isolated browser context.
2. Create a synthetic ledger through the finance domain functions, validate it, and load it only into that context's local storage. Keep real account records and exported backups out of screenshots.
3. Capture the viewport and theme combinations above at 2× density. Wait for local fonts, app artwork, and cash-flow layout before capturing; check for page errors and horizontal overflow.
4. Supply the new screenshots and original [Tally icon](../public/tally-icon.png) to the [saved prompts](./media/banner-prompts.md). Review the generated headline, device framing, and screen fidelity.
5. Preserve the PNG output, create a WebP delivery copy, and update both READMEs and this asset inventory together.

Use the original icon and the tokens in [DESIGN.md](../DESIGN.md) for future compositions. Keep claims aligned with the implementation: local browser storage, manual FX, explicit subscription-payment recording, and responsive web layouts.

## Attribution

Tally is independent of the banks and services pictured. Their names and artwork identify sample accounts or subscriptions and do not imply affiliation or endorsement. See [NOTICE.md](../NOTICE.md) and the [bank artwork sources](./bank-icon-sources.md). This kit does not change the repository's unlicensed status or grant rights to third-party marks.
