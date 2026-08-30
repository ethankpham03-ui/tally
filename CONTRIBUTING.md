# Contributing to Tally

Thanks for taking the time to improve Tally. Issue reports and focused suggestions are welcome. The repository currently has no open-source license, so discuss code changes with the maintainer before opening a pull request; public source access does not grant reuse rights.

## Before you start

1. Search existing issues before opening a new one.
2. Before writing code, open an issue and confirm that a pull request is wanted.
3. Never include real financial data, credentials, or exported user backups in an issue, fixture, screenshot, or commit.

## Local setup

```bash
npm ci
npm run dev
```

Tally requires Node.js 22.13 or newer.

## Product constraints

- Keep the transaction ledger as the source of truth for financial totals.
- Keep subscription payments explicit; a renewal date alone must not create an expense.
- Preserve local-first behavior unless a change has an agreed privacy model.
- Update English and Vietnamese copy together.
- Keep the complete flow usable from 320px mobile layouts through desktop.
- Use design tokens and the established Tally visual language rather than one-off styles.

## Quality bar

Run the full check before opening a pull request:

```bash
npm run check
```

Add or update tests for domain behavior. For visible changes, describe the affected desktop and mobile states in the pull request and include current screenshots when useful.

## Commits and pull requests

Use a short, imperative commit subject. Conventional prefixes such as `feat:`, `fix:`, `docs:`, and `test:` are welcome. Keep pull requests focused, explain the user-facing outcome, and call out any privacy, persistence, migration, or accessibility impact.
