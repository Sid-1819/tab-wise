# Tabwise 2.0 🧠🗂️
**The wise way to wrangle your web - Now with React & TypeScript**

Tabwise is a modern, productivity-focused Chrome extension built with React, TypeScript, and shadcn/ui that helps you manage, search, and organize your browser tabs efficiently. Designed with a clean UI and smart UX, Tabwise makes multitasking and web browsing a breeze.

---

## ✨ What's New in v2.0

### 🎨 Modern Tech Stack
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **shadcn/ui** - Beautiful, accessible components
- **Tailwind CSS** - Utility-first styling
- **Vite** - Lightning-fast build tool
- **Radix UI** - Unstyled, accessible primitives

### 🚀 Enhanced Features
- **Type-Safe**: Full TypeScript support for better DX
- **Component-Based**: Modular, reusable React components
- **Modern UI**: sleek design with shadcn/ui components
- **Improved Performance**: React optimization and efficient rendering
- **Better Theming**: Enhanced dark/light mode with smooth transitions
- **Scalable Architecture**: Easy to extend and maintain

---

## 🎯 Current Features

- 🔍 **Smart Tab Search** – Quickly find tabs using keywords in title or URL
- 📁 **Automatic Tab Grouping** – Organize tabs by domain automatically
- 🧠 **Clean & Modern UI** – Built with shadcn/ui and Tailwind CSS
- 🎨 **Dark/Light Mode** – Eye-friendly theme switching
- ⚡ **Fast Performance** – React + Vite for instant interactions
- 🔒 **Type-Safe** – Full TypeScript coverage
- ♿ **Accessible** – Built with Radix UI primitives
- 📊 **Tab Statistics** – See total tabs and groups at a glance
- 💾 **Memory Optimization** *(Chrome Dev/Canary only)* – Track memory usage and optimize high-memory tabs

---

## 📦 Installation

### From Chrome Web Store
> [🚀 Click here to install Tabwise](https://chromewebstore.google.com/detail/tab-wise/ohpilcjcbejponkajcccllodpgcnnlpg)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sid-1819/tab-wise.git
   cd tab-wise
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from the project

5. **Development mode** (with hot reload)
   ```bash
   npm run dev
   ```
   - Then load the `dist` folder as unpacked extension
   - Changes will rebuild automatically

---

## 🛠️ Tech Stack

### Frontend
- **React 18.2** - UI framework
- **TypeScript 5.2** - Type safety
- **Vite 5.1** - Build tool and dev server
- **Tailwind CSS 3.4** - Utility-first CSS

### UI Components
- **shadcn/ui** - Component library
- **Radix UI** - Headless UI primitives
- **Lucide React** - Icon library
- **class-variance-authority** - Component variants
- **tailwind-merge** - Utility class merging

### Chrome Extension
- **@crxjs/vite-plugin** - Chrome extension support for Vite
- **@types/chrome** - Chrome API type definitions

### Code Quality
- **ESLint** - Linting
- **TypeScript** - Static type checking
- **PostCSS** - CSS processing

---

## 📁 Project Structure

```
tab-wise/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   └── switch.tsx
│   │   ├── popup.tsx        # Main popup component
│   │   ├── search-bar.tsx   # Search functionality
│   │   ├── tab-item.tsx     # Individual tab component
│   │   ├── tab-group-card.tsx  # Tab group component
│   │   ├── theme-provider.tsx  # Theme context
│   │   └── theme-toggle.tsx    # Theme switcher
│   ├── lib/
│   │   ├── utils.ts         # Utility functions
│   │   └── tab-utils.ts     # Tab-specific utilities
│   ├── types/
│   │   └── tab.ts           # TypeScript interfaces
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── icons/                    # Extension icons
├── manifest.json            # Extension manifest
├── index.html               # Popup HTML
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies
```

---

## 🎨 Component Architecture

### Component Hierarchy
```
App
└── ThemeProvider
    └── Popup
        ├── Header
        │   ├── Title
        │   └── ThemeToggle
        ├── SearchBar
        └── ScrollArea
            └── TabGroupCard[]
                └── TabItem[]
```

### Key Components

- **`Popup`**: Main container, manages tab state and operations
- **`SearchBar`**: Search input with tab/group statistics
- **`TabGroupCard`**: Groups tabs by domain with bulk actions
- **`TabItem`**: Individual tab with click and close actions
- **`ThemeToggle`**: Light/dark mode switcher
- **`ThemeProvider`**: Context provider for theming

---

## 🔧 Scripts

```bash
# Development with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## 🎯 Usage

1. **Click the extension icon** in your browser toolbar
2. **Search tabs** using the search bar
3. **Click a tab** to switch to it
4. **Close tabs** using the × button
5. **Close all tabs in a group** with the "Close All" button
6. **Toggle theme** using the sun/moon switch

---

## 🚀 Next-Level Features (Roadmap)

See [NEXT_LEVEL_FEATURES.md](./NEXT_LEVEL_FEATURES.md) for a comprehensive list of planned features including:

### Coming Soon
- 💾 **Session Management** - Save and restore tab sessions
- ⌨️ **Keyboard Shortcuts** - Quick actions with shortcuts
- 📊 **Analytics Dashboard** - Tab usage insights
- 🔄 **Tab Sync** - Sync across devices
- 🤖 **AI-Powered Features** - Smart suggestions and cleanup
- 🎨 **Custom Themes** - Personalized color schemes
- 📤 **Export/Import** - Backup and share sessions
- 🔍 **Advanced Search** - Filters and regex support

### Premium Features (Planned)
- ☁️ Cloud sync across devices
- 📈 Advanced analytics
- 👥 Team collaboration
- 🎯 Smart automation rules
- 🔌 Third-party integrations

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Use TypeScript for all new code
- Follow the existing component structure
- Use shadcn/ui components where possible
- Write meaningful commit messages
- Test in Chrome before submitting PR

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **shadcn/ui** - For the beautiful component library
- **Radix UI** - For accessible UI primitives
- **Tailwind CSS** - For the utility-first CSS framework
- **Vite** - For the blazing-fast build tool
- **Chrome Extensions** - For the powerful extension API

---

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Sid-1819/tab-wise/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/Sid-1819/tab-wise/discussions)
- ⭐ **Star the repo** if you find it useful!

---

## 📊 Stats

![Chrome Web Store](https://img.shields.io/chrome-web-store/v/ohpilcjcbejponkajcccllodpgcnnlpg)
![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/ohpilcjcbejponkajcccllodpgcnnlpg)
![Chrome Web Store Rating](https://img.shields.io/chrome-web-store/rating/ohpilcjcbejponkajcccllodpgcnnlpg)
![GitHub Stars](https://img.shields.io/github/stars/Sid-1819/tab-wise)
![License](https://img.shields.io/github/license/Sid-1819/tab-wise)

---

Made with ❤️ by [Siddhesh Shirdhankar](https://github.com/Sid-1819)
