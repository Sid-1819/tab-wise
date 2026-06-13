# Contributing to Tab Wise

Thank you for your interest in contributing! Tab Wise is an open-source Chrome extension, and community help is welcome.

## Ways to contribute

- **Bug reports** — Something broken? [Open an issue](https://github.com/Sid-1819/tab-wise/issues)
- **Feature ideas** — [Start a discussion](https://github.com/Sid-1819/tab-wise/discussions) or comment on the [roadmap](./NEXT_LEVEL_FEATURES.md)
- **Code** — Fix bugs or implement features via pull request
- **Documentation** — Improve README, comments, or examples

## Before you start

1. Search [existing issues](https://github.com/Sid-1819/tab-wise/issues) to avoid duplicate work
2. For **non-trivial changes**, open an issue first or comment on one saying you'd like to work on it
3. For small fixes (typos, obvious bugs), a PR without a prior issue is fine

## Development setup

**Prerequisites:** Node.js 20+, [pnpm](https://pnpm.io/) 11+, Google Chrome

```bash
git clone https://github.com/Sid-1819/tab-wise.git
cd tab-wise
pnpm install
pnpm dev
```

Load the extension in Chrome:

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder
4. Click the Tab Wise toolbar icon to open the side panel

After code changes, reload the extension on `chrome://extensions/` if hot reload doesn't pick them up.

## Project layout

| Path | Purpose |
|------|---------|
| `src/background.ts` | Service worker — tab events, activity tracking, messaging |
| `src/components/sidepanel.tsx` | Main side panel UI |
| `src/components/ui/` | shadcn/ui primitives — reuse these for new UI |
| `src/lib/` | Business logic, storage, tab/session utilities |
| `src/hooks/` | React hooks |
| `src/types/` | Shared TypeScript types |
| `manifest.json` | Extension permissions and entry points |

**Architecture:** The side panel UI communicates with the background service worker via `chrome.runtime.sendMessage`. Tab state and activity data are managed in the background; UI components subscribe to updates.

## Code guidelines

- **TypeScript** for all new code
- Match existing patterns — read surrounding files before adding new ones
- Use **shadcn/ui** components from `src/components/ui/` instead of building raw HTML controls
- Put reusable logic in `src/lib/`, not inside components
- Chrome extension APIs that need persistence or tab listeners belong in `background.ts`
- Run **`pnpm lint`** and **`pnpm build`** before opening a PR
- Test manually in Chrome — load `dist/` and exercise the side panel, grouping, sessions, and search

## Commit messages

Use clear, descriptive messages. Conventional prefixes are encouraged:

```
feat: add keyboard shortcut to focus search
fix: prevent duplicate session restore on empty window
docs: clarify pnpm setup in README
```

## Pull request process

1. Fork the repo and create a branch from `main`
2. Make focused changes — one logical feature or fix per PR
3. Fill out the PR description:
   - **What** changed and **why**
   - **How to test** (steps a reviewer can follow)
   - Screenshots or GIFs for UI changes
4. Link related issues (`Fixes #123`)
5. Ensure CI checks pass (lint + build)

## What we look for in reviews

- Does it solve the stated problem without unrelated refactors?
- Is the UI consistent with existing components and themes?
- Are new Chrome permissions justified and documented?
- Does it work in the side panel context (not just in isolation)?

## Feature roadmap

See [NEXT_LEVEL_FEATURES.md](./NEXT_LEVEL_FEATURES.md) for planned features. Issues labeled `good first issue` or `help wanted` are great starting points.

## Questions?

Open a [GitHub Discussion](https://github.com/Sid-1819/tab-wise/discussions) or comment on a relevant issue.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
