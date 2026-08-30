# Security policy

## Supported version

Security fixes are applied to the latest code on `main` and the current public deployment.

## Report a vulnerability privately

Please do not open a public issue for a suspected vulnerability. Use [GitHub's private vulnerability reporting](https://github.com/ethankpham03-ui/tally/security/advisories/new) and include:

- the affected route or feature;
- clear reproduction steps;
- the expected and observed behavior; and
- the impact, without including real personal finance data.

Reports made in good faith are welcome. Please allow time to investigate before publishing details.

## Local-first threat model

Tally does not provide authentication, cloud storage, or multi-device synchronization. Anyone with access to the browser profile or an exported backup may be able to read its finance data. Users are responsible for device access controls and for storing exported JSON backups securely.
