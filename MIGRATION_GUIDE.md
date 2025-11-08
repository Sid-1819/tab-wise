# Migration Guide: JavaScript → React TypeScript

## Overview
This guide documents the migration from vanilla JavaScript to React TypeScript with shadcn/ui components.

## 🔄 Key Changes

### File Structure Changes

#### Before (Vanilla JS)
```
tab-wise/
├── src/
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── utils/
│       └── constants.js
└── manifest.json
```

#### After (React TypeScript)
```
tab-wise/
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── popup.tsx         # Main component
│   │   ├── search-bar.tsx
│   │   ├── tab-item.tsx
│   │   ├── tab-group-card.tsx
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── lib/
│   │   ├── utils.ts
│   │   └── tab-utils.ts
│   ├── types/
│   │   └── tab.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
└── manifest.json
```

## 📝 Code Migration Examples

### 1. Theme Toggle

#### Before (popup.js)
```javascript
const toggle = document.getElementById('toggle-theme');

toggle.addEventListener('change', () => {
  const theme = toggle.checked ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
});

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  toggle.checked = savedTheme === 'dark';
});
```

#### After (theme-provider.tsx + theme-toggle.tsx)
```typescript
// theme-provider.tsx
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('vite-ui-theme') as Theme) || 'light'
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// theme-toggle.tsx
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Switch
      checked={theme === 'dark'}
      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
    />
  );
}
```

### 2. Tab Grouping Logic

#### Before (popup.js)
```javascript
function groupTabs(tabs) {
  const groups = {};
  tabs.forEach(tab => {
    try {
      const url = new URL(tab.url);
      let groupName;

      if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') {
        groupName = 'Chrome';
      } else {
        const rawDomain = url.hostname.replace(/^www\./, '');
        groupName = prettifyDomain(rawDomain);
      }

      if (!groups[groupName]) {
        groups[groupName] = { tabs: [] };
      }
      groups[groupName].tabs.push(tab);
    } catch (e) {
      // Handle error
    }
  });

  return groups;
}
```

#### After (tab-utils.ts)
```typescript
export function groupTabs(tabs: TabInfo[]): GroupedTabs {
  const groups: GroupedTabs = {};

  tabs.forEach((tab) => {
    try {
      const url = new URL(tab.url);
      let groupName: string;

      if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') {
        groupName = 'Chrome';
      } else {
        const rawDomain = url.hostname.replace(/^www\./, '');
        groupName = prettifyDomain(rawDomain);
      }

      if (!groups[groupName]) {
        groups[groupName] = {
          domain: groupName,
          tabs: [],
          favicon: tab.favIconUrl
        };
      }
      groups[groupName].tabs.push(tab);
    } catch (e) {
      // Handle error with TypeScript type safety
    }
  });

  return groups;
}
```

### 3. Tab Item Component

#### Before (popup.js - DOM manipulation)
```javascript
function createTabElement(tab) {
  const tabEl = document.createElement('div');
  tabEl.className = 'tab-item';

  const favicon = document.createElement('img');
  favicon.src = tab.favIconUrl;

  const label = document.createElement('span');
  label.textContent = tab.title;
  label.onclick = () => {
    chrome.tabs.update(tab.id, { active: true });
    window.close();
  };

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✖';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    chrome.tabs.remove(tab.id);
  };

  tabEl.appendChild(favicon);
  tabEl.appendChild(label);
  tabEl.appendChild(closeBtn);

  return tabEl;
}
```

#### After (tab-item.tsx - React component)
```typescript
export function TabItem({ tab, onClose, onClick }: TabItemProps) {
  return (
    <div
      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer group"
      onClick={() => onClick(tab.id)}
    >
      <img
        src={tab.favIconUrl || DEFAULT_FAVICON}
        alt=""
        className="w-4 h-4"
      />
      <span className="flex-1 text-sm truncate">{tab.title}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onClose(tab.id);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
```

### 4. Search Functionality

#### Before (popup.js)
```javascript
function filterTabs(e) {
  const query = e.target.value.toLowerCase();
  const tabItems = document.querySelectorAll('.tab-item[data-url]');

  tabItems.forEach(tabEl => {
    const title = (tabEl.dataset.title || '').toLowerCase();
    const url = (tabEl.dataset.url || '').toLowerCase();
    const isVisible = title.includes(query) || url.includes(query);
    tabEl.style.display = isVisible ? 'flex' : 'none';
  });
}
```

#### After (popup.tsx - React hooks)
```typescript
export function Popup() {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTabs = useMemo(() => {
    if (!searchQuery) return tabs;
    return filterTabs(tabs, searchQuery);
  }, [tabs, searchQuery]);

  const groupedTabs = useMemo(() => {
    return groupTabs(filteredTabs);
  }, [filteredTabs]);

  return (
    <SearchBar
      value={searchQuery}
      onChange={setSearchQuery}
      totalTabs={filteredTabs.length}
      totalGroups={Object.keys(groupedTabs).length}
    />
  );
}
```

## 🎨 CSS Migration

### Before (popup.css)
```css
:root[data-theme="light"] {
  --bg-color: #ffffff;
  --text-color: #000000;
  --card-bg: #ffffff;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 8px;
  gap: 8px;
  border-radius: 6px;
}

.tab-item:hover {
  background-color: var(--hover-bg);
}
```

### After (Tailwind CSS + CSS Variables)
```css
/* index.css - Using Tailwind and shadcn/ui variables */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
  }
}

/* Components use Tailwind classes */
/* className="flex items-center gap-2 p-2 rounded-md hover:bg-accent" */
```

## 🔧 TypeScript Benefits

### Type Safety
```typescript
// Before: No type checking
function closeTabs(tabs) {
  const tabIds = tabs.map(tab => tab.id);
  chrome.tabs.remove(tabIds);
}

// After: Full type checking
interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
}

function closeTabs(tabs: TabInfo[]): void {
  const tabIds: number[] = tabs.map(tab => tab.id);
  chrome.tabs.remove(tabIds);
}
```

### IntelliSense & Autocomplete
- Full autocomplete for Chrome API
- Component prop validation
- Catch errors at compile time

## 📦 Build Process

### Before
```bash
# No build step - direct loading
# Just load src/popup/popup.html
```

### After
```bash
# Modern build with Vite
npm install       # Install dependencies
npm run dev      # Development with hot reload
npm run build    # Production build to dist/
```

## 🚀 Performance Improvements

1. **React Optimization**
   - Virtual DOM for efficient updates
   - `useMemo` for expensive computations
   - `useCallback` to prevent re-renders

2. **Build Optimization**
   - Vite's fast HMR (Hot Module Replacement)
   - Code splitting
   - Tree shaking
   - Minification

3. **Component Reusability**
   - shadcn/ui components are optimized
   - Radix UI primitives are accessible and performant

## 🎯 Developer Experience

### Before
- Manual DOM manipulation
- No type checking
- Limited tooling
- Manual testing

### After
- Declarative React components
- Full TypeScript support
- ESLint + Prettier
- React DevTools
- Better debugging
- Component testing ready

## 📊 Comparison

| Aspect | Vanilla JS | React TypeScript |
|--------|------------|------------------|
| **Type Safety** | ❌ None | ✅ Full TypeScript |
| **Component Reuse** | ⚠️ Manual | ✅ React components |
| **State Management** | ⚠️ Manual | ✅ React hooks |
| **UI Framework** | ❌ Custom CSS | ✅ shadcn/ui + Tailwind |
| **Build Tools** | ❌ None | ✅ Vite |
| **Developer Tools** | ⚠️ Limited | ✅ React DevTools |
| **Testing** | ⚠️ Manual | ✅ Jest + RTL ready |
| **Performance** | ✅ Good | ✅ Excellent |
| **Maintainability** | ⚠️ Medium | ✅ High |
| **Scalability** | ⚠️ Limited | ✅ Excellent |

## 🔄 Migration Checklist

- [x] Set up React + TypeScript with Vite
- [x] Configure Tailwind CSS
- [x] Install shadcn/ui components
- [x] Create TypeScript interfaces for tabs
- [x] Convert theme system to React
- [x] Convert tab grouping logic
- [x] Create React components for UI
- [x] Implement search with React hooks
- [x] Update manifest.json
- [x] Configure build process
- [x] Test in Chrome
- [ ] Add tests (Jest + RTL)
- [ ] Add CI/CD pipeline
- [ ] Performance optimization
- [ ] Accessibility audit

## 🎉 Result

The migration brings:
- **Better DX**: TypeScript + modern tooling
- **Scalability**: Easy to add complex features
- **Maintainability**: Clean component architecture
- **Performance**: React optimization + Vite
- **Modern UI**: shadcn/ui + Tailwind CSS
- **Type Safety**: Catch bugs at compile time
- **Accessibility**: Radix UI primitives
