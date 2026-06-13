# Security Policy

## Supported versions

Security fixes are provided for the latest release published on the
[Chrome Web Store](https://chromewebstore.google.com/detail/tab-wise/ohpilcjcbejponkajcccllodpgcnnlpg)
and the current `main` branch of this repository.

| Version | Supported |
| ------- | --------- |
| Latest Chrome Web Store release | ✅ |
| `main` branch | ✅ |
| Older versions | ❌ |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security issue in Tab Wise, report it privately using one of
these methods:

1. **Preferred:** [GitHub Private Security Advisory](https://github.com/Sid-1819/tab-wise/security/advisories/new)
2. **Alternative:** Contact the maintainer via [GitHub profile](https://github.com/Sid-1819)

Include as much detail as possible:

- Description of the vulnerability and potential impact
- Steps to reproduce
- Affected version(s)
- Proof of concept or exploit code (if available)
- Suggested fix (if you have one)

## What to expect

- **Acknowledgment** within 3 business days
- **Initial assessment** within 7 business days
- **Status updates** as the issue is investigated and fixed
- **Credit** in the advisory or release notes (unless you prefer to remain anonymous)

## Scope

The following are **in scope**:

- Tab Wise Chrome extension code in this repository
- Privilege escalation via extension permissions (`tabs`, `storage`, `sessions`, etc.)
- Data leakage between extension contexts (background, side panel)
- Unsafe handling of session data, imported links, or synced storage
- XSS or injection in the side panel UI

The following are **out of scope**:

- Vulnerabilities in Chrome itself (report to [Google Chrome](https://bugs.chromium.org/p/chromium/issues/list))
- Social engineering or physical attacks
- Denial of service against a user's browser through excessive tab operations
- Issues in third-party sites opened in tabs (not caused by Tab Wise)

## Safe harbor

We support responsible disclosure. We will not pursue legal action against
researchers who report vulnerabilities in good faith and follow this policy.

## Security best practices for contributors

When contributing, please:

- Request new Chrome permissions only when necessary and document why in the PR
- Avoid `innerHTML` and unsanitized user input in the UI
- Validate imported session JSON / share links before use
- Do not commit secrets, API keys, or `.env` files
- Run `pnpm lint` and `pnpm build` before submitting changes

## Security tooling

This repository uses [CodeQL](https://codeql.github.com/) analysis on pull
requests and the `main` branch. See `.github/workflows/codeql.yml`.
