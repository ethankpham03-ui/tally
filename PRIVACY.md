# Privacy notes

Tally is a local-first portfolio project. It is designed so that personal finance data remains on the device where it was entered.

## Data Tally stores

Tally stores the following values in the browser's local storage:

- the current versioned finance document containing money-source names and types, native currencies and opening balances, transactions, budgets, subscriptions and their payment history, credit limits and card statements, manually entered exchange rates, and whether initial setup is pending, completed, or skipped;
- the original legacy finance document and an exact pre-migration backup when upgrading existing data to V4;
- the selected interface language; and
- the selected color theme.

The application has no sign-in account system, backend database, analytics SDK, advertising tracker, or cloud synchronization. Financial accounts in Tally are local records; the app does not connect to banks, request banking credentials, fetch exchange rates, or make payments. Tally does not transmit the finance document to the hosting service.

## Backups and deletion

Browser or operating-system cleanup can remove local storage. Use Tally's JSON export to keep a portable backup and its validated import flow to restore one. The in-app clear-data action requires confirmation and resets the current finance document; it does not erase the original legacy document or its migration backup. To remove all Tally data retained by that browser, clear the site's storage in browser settings. Previously downloaded exports are separate files and must be managed separately.

V4 keeps its active document under `tally-finance-v4`. Migration leaves `tally-finance-v1` untouched and saves its exact contents under `tally-finance-v1-backup-before-v4` before writing the migrated document. These recovery copies remain on the same device and are not cloud backups. Invalid or newer stored data blocks application writes instead of being silently replaced with sample data.

New installations start without sample financial records. Existing ledgers explicitly marked as untouched demo data are replaced with an empty personal ledger. Ledgers that a user has edited are personal data and are not automatically cleared. Completing or skipping onboarding is remembered locally, without analytics or identity collection.

Exported backup files contain the financial information entered into Tally. Store and share them with the same care as any other personal finance document.

## External links

The subscription catalog includes source links for plan and price references. Those links open only after a user chooses to visit them, and the destination site's own privacy policy then applies.

## Scope

This document describes the implementation in this repository; a hosted site changes only when that implementation is deployed. It will be updated if the data model or network behavior changes.
