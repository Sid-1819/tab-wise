# Tab Wise

**The wise way to wrangle your web.**

Tab Wise is a productivity-focused Chrome extension that helps you manage, search, and organize open browser tabs. Built with React, TypeScript, and shadcn/ui, it runs in Chrome's side panel with a clean UI and smart tab workflows.

---

<img width="1280" height="800" alt="Screenshot 2026-06-13 at 14 45 02" src="https://github.com/user-attachments/assets/e609ae2f-9c95-4fc5-b904-49c1b9a1d60a" />
## Features

- **Smart Tab Search** 
- **Tab Grouping** — Organize tabs with domain-based auto-grouping and manual group creation. Refer to 'Auto-Grouping Strategies' for details.
- **Saved Sessions** 
- **Recently Closed** 
- **Duplicate Detection** 
- **Activity Tracking** 
- **System Memory Bar** 
- **Light / Dark Theme** 
- **Side Panel UI**
## Installation

### From Chrome Web Store

[Install Tab Wise from the Chrome Web Store](https://chromewebstore.google.com/detail/tab-wise/ohpilcjcbejponkajcccllodpgcnnlpg)

### Development Setup

**Prerequisites:** Node.js 20+, [pnpm](https://pnpm.io/) 11+

1. **Clone the repository**

   ```bash
   git clone https://github.com/Sid-1819/tab-wise.git
   cd tab-wise
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start the dev server** (hot reload)

   ```bash
   pnpm dev
   ```

   Or build for production:

   ```bash
   pnpm build
   ```

4. **Load in Chrome**

   - Open `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the `dist/` folder

5. **Open the side panel**

   - Click the Tab Wise toolbar icon, or
   - Right-click the icon and choose **Open side panel**

---

## Usage

1. Open Tab Wise from the toolbar icon
2. Search tabs using the search bar
3. Click a tab to switch to it, or close individual tabs
4. Use group actions to close, favorite, or reorganize tabs
5. Save and restore sessions from the sessions panel
6. Toggle theme from the header

---

## Auto-Grouping Strategies
Tab Wise employs intelligent strategies to automatically organize your open tabs.

- **Domain-based Grouping**: Tabs are primarily grouped by their root domain. For example, all tabs open from `github.com` (e.g., `github.com/repo1`, `github.com/profile`) will be placed into a single, labeled group. This simplifies finding and managing related content.
- **Future Enhancements**: The extension is designed to support more sophisticated, potentially user-defined auto-grouping heuristics in the future, expanding beyond domain-based rules to further customize tab organization.

---

## Tech Stack

| Layer | Tools |
|-------|-------|
| UI | React 18, TypeScript, Tailwind CSS 4, shadcn/ui, Radix UI |
| Build | Vite, [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin) |
| Extension | Manifest V3, Chrome Side Panel API, service worker background script |
| Quality | ESLint, TypeScript strict checking |

---

## Project Structure

```
tab-wise/
├── src/
│   ├── background.ts           # Service worker (tab events, activity tracking)
│   ├── sidepanel-main.tsx      # Side panel entry point
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── sidepanel.tsx       # Main side panel layout
│   │   ├── tab-group-card.tsx  # Grouped tab cards
│   │   ├── saved-sessions.tsx  # Session save/restore
│   │   └── ...
│   ├── hooks/                  # React hooks (activity, memory)
│   ├── lib/                    # Tab utils, storage, session capture
│   └── types/                  # TypeScript interfaces
├── icons/
├── manifest.json
├── sidepanel.html
└── vite.config.ts
```

---

## Scripts

```bash
pnpm dev       # Development build with hot reload
pnpm build     # Production build to dist/
pnpm preview   # Preview production build
pnpm lint      # Run ESLint
```

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, code guidelines, and the pull request process.

Feature ideas and roadmap: [NEXT_LEVEL_FEATURES.md](./NEXT_LEVEL_FEATURES.md)

---

## Support

- **Bug reports:** [GitHub Issues](https://github.com/Sid-1819/tab-wise/issues)
- **Feature requests:** [GitHub Discussions](https://github.com/Sid-1819/tab-wise/discussions)
- **Security issues:** [Security policy](./SECURITY.md) — please report privately, not via public issues

## Community

- [Contributing](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

## Stats

![Chrome Web Store](https://img.shields.io/chrome-web-store/v/ohpilcjcbejponkajcccllodpgcnnlpg)
![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/ohpilcjcbejponkajcccllodpgcnnlpg)
![Chrome Web Store Rating](https://img.shields.io/chrome-web-store/rating/ohpilcjcbejponkajcccllodpgcnnlpg)
![GitHub Stars](https://img.shields.io/github/stars/Sid-1819/tab-wise)
![License](https://img.shields.io/github/license/Sid-1819/tab-wise)

---

Made with care by [Siddhesh Shirdhankar](https://github.com/Sid-1819)
