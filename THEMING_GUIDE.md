# 🎨 Theming Guide - Tab Wise

## Overview

Tab Wise uses **shadcn/ui v2** with **OKLCH color space** for modern, perceptually uniform colors. The theming system is built on CSS variables and Tailwind CSS.

---

## 🎨 Color System

### OKLCH Color Space

OKLCH provides:
- **Perceptual uniformity** - Colors look equally bright
- **Better contrast** - More accessible color combinations
- **Wider gamut** - More vibrant colors
- **Future-proof** - Modern CSS standard

### Color Format

```css
--primary: oklch(0.6801 0.1583 276.9349);
         /*  L      C      H          */
```

- **L** (Lightness): 0-1 (0 = black, 1 = white)
- **C** (Chroma): 0-0.4 (0 = gray, higher = more saturated)
- **H** (Hue): 0-360 (color wheel degrees)

---

## 🎯 Theme Variables

### Base Colors

#### Light Mode
```css
:root {
  --background: oklch(0.9842 0.0034 247.8575);  /* Almost white */
  --foreground: oklch(0.2795 0.0368 260.0310);  /* Dark blue-gray */
  --primary: oklch(0.5854 0.2041 277.1173);     /* Blue */
  --card: oklch(1.0000 0 0);                     /* Pure white */
}
```

#### Dark Mode
```css
.dark {
  --background: oklch(0.2077 0.0398 265.7549);  /* Dark blue */
  --foreground: oklch(0.9288 0.0126 255.5078);  /* Light gray */
  --primary: oklch(0.6801 0.1583 276.9349);     /* Lighter blue */
  --card: oklch(0.2795 0.0368 260.0310);        /* Dark card */
}
```

### All Theme Variables

**Semantic Colors:**
- `--background` / `--foreground` - Main background and text
- `--card` / `--card-foreground` - Card backgrounds
- `--popover` / `--popover-foreground` - Popup/tooltip backgrounds
- `--primary` / `--primary-foreground` - Primary brand color
- `--secondary` / `--secondary-foreground` - Secondary actions
- `--muted` / `--muted-foreground` - Muted/disabled states
- `--accent` / `--accent-foreground` - Accent highlights
- `--destructive` / `--destructive-foreground` - Danger/delete actions

**UI Elements:**
- `--border` - Border color
- `--input` - Input field borders
- `--ring` - Focus ring color

**Charts (Optional):**
- `--chart-1` through `--chart-5` - Chart colors

**Sidebar (Optional):**
- `--sidebar` / `--sidebar-foreground`
- `--sidebar-primary` / `--sidebar-primary-foreground`
- `--sidebar-accent` / `--sidebar-accent-foreground`
- `--sidebar-border` / `--sidebar-ring`

---

## 🛠️ Using Theme Colors

### In Components

```tsx
// Using Tailwind classes
<div className="bg-background text-foreground">
  <h1 className="text-primary">Tab Wise</h1>
  <p className="text-muted-foreground">Subtitle text</p>
</div>

// Card with proper colors
<Card>
  <CardHeader className="text-card-foreground">
    Header
  </CardHeader>
</Card>

// Button variants
<Button variant="default">Primary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="secondary">Secondary</Button>
```

### Available Color Classes

**Background:**
- `bg-background`, `bg-foreground`
- `bg-card`, `bg-popover`
- `bg-primary`, `bg-secondary`
- `bg-muted`, `bg-accent`
- `bg-destructive`

**Text:**
- `text-foreground`, `text-background`
- `text-primary`, `text-primary-foreground`
- `text-muted-foreground`
- `text-card-foreground`

**Border:**
- `border-border`
- `border-input`
- `ring-ring` (focus ring)

---

## 🎨 Customizing Theme

### Method 1: Modify CSS Variables

Edit `src/index.css`:

```css
:root {
  /* Change primary color */
  --primary: oklch(0.65 0.20 150); /* Green */

  /* Change background */
  --background: oklch(0.98 0.01 240); /* Slightly blue */
}
```

### Method 2: Use Color Tools

**Recommended Tools:**
- [OKLCH Color Picker](https://oklch.com/)
- [Coloraide](https://facelessuser.github.io/coloraide/)
- [shadcn/ui Themes](https://ui.shadcn.com/themes)

### Method 3: Generate from Base Color

Use shadcn CLI to generate theme:

```bash
npx shadcn@latest add
# Select theme colors
```

---

## 🌈 Pre-made Theme Examples

### Violet Theme
```css
:root {
  --primary: oklch(0.59 0.21 293);
}
.dark {
  --primary: oklch(0.71 0.18 293);
}
```

### Green Theme
```css
:root {
  --primary: oklch(0.58 0.18 145);
}
.dark {
  --primary: oklch(0.70 0.16 145);
}
```

### Orange Theme
```css
:root {
  --primary: oklch(0.65 0.20 50);
}
.dark {
  --primary: oklch(0.72 0.18 50);
}
```

### Red Theme
```css
:root {
  --primary: oklch(0.60 0.22 25);
}
.dark {
  --primary: oklch(0.68 0.19 25);
}
```

---

## 🎭 Theme Switching

### Current Implementation

The extension uses `ThemeProvider` with local storage:

```tsx
// src/components/theme-provider.tsx
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
```

### Using Theme Hook

```tsx
import { useTheme } from '@/components/theme-provider';

function MyComponent() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  );
}
```

---

## 🔧 Advanced Customization

### Custom Color Variables

Add your own colors in `src/index.css`:

```css
:root {
  --success: oklch(0.60 0.18 145);
  --warning: oklch(0.75 0.15 90);
  --info: oklch(0.60 0.20 240);
}

@theme inline {
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-info: var(--info);
}
```

Then use in Tailwind:

```tsx
<div className="bg-[var(--color-success)]">Success!</div>
```

Or extend `tailwind.config.js`:

```js
colors: {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  info: "var(--color-info)",
}
```

### Font Customization

The theme includes font variables:

```css
:root {
  --font-sans: Inter, sans-serif;
  --font-serif: Merriweather, serif;
  --font-mono: JetBrains Mono, monospace;
}
```

Use in components:

```tsx
<h1 className="font-sans">Sans-serif heading</h1>
<code className="font-mono">Monospace code</code>
```

### Shadow Customization

Custom shadow system:

```css
:root {
  --shadow-sm: 0px 4px 8px -1px hsl(0 0% 0% / 0.10);
  --shadow-md: 0px 4px 8px -1px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0px 4px 8px -1px hsl(0 0% 0% / 0.10);
}
```

Use in components:

```tsx
<Card className="shadow-md">Content</Card>
```

---

## 📐 Border Radius

The theme uses a consistent radius system:

```css
:root {
  --radius: 0.5rem; /* Base radius */
}

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);  /* 0.25rem */
  --radius-md: calc(var(--radius) - 2px);  /* 0.375rem */
  --radius-lg: var(--radius);               /* 0.5rem */
  --radius-xl: calc(var(--radius) + 4px);  /* 0.75rem */
}
```

Use in components:

```tsx
<div className="rounded-lg">Standard radius</div>
<div className="rounded-xl">Large radius</div>
<div className="rounded-sm">Small radius</div>
```

---

## 🎯 Best Practices

### DO ✅

- Use semantic color names (`bg-primary`, not `bg-blue-500`)
- Test both light and dark themes
- Maintain color contrast ratios (WCAG AA minimum)
- Use OKLCH for custom colors
- Use CSS variables for consistency

### DON'T ❌

- Hardcode colors (`bg-[#3b82f6]`)
- Mix color systems (OKLCH + HSL in same variable)
- Override theme colors in components
- Use too many custom colors
- Forget dark mode styling

---

## 🔍 Debugging Theme Issues

### Check Theme Class

```tsx
// In browser console
document.documentElement.classList.contains('dark')
```

### Inspect CSS Variables

```tsx
// In browser console
getComputedStyle(document.documentElement).getPropertyValue('--primary')
```

### Common Issues

**Theme not switching:**
- Check `ThemeProvider` is wrapping app
- Verify `dark` class on `<html>` element
- Check localStorage key

**Colors not applying:**
- Verify CSS variable exists in `src/index.css`
- Check Tailwind config includes color
- Rebuild: `npm run build`

**Wrong colors in dark mode:**
- Check `.dark` selector in CSS
- Verify dark mode variables are defined
- Test with browser DevTools

---

## 📦 Theme Presets (Coming Soon)

Future enhancement: Multiple theme presets

```tsx
// Future API
<ThemeProvider preset="violet">
  <App />
</ThemeProvider>

// Or
setTheme({ mode: 'dark', preset: 'green' })
```

---

## 🎨 Theme Configuration Files

**`src/index.css`** - CSS variables and theme definitions
**`tailwind.config.js`** - Tailwind color mappings
**`components.json`** - shadcn/ui configuration
**`src/components/theme-provider.tsx`** - Theme context
**`src/components/theme-toggle.tsx`** - Theme switcher UI

---

## 🚀 Quick Start

1. **Change Primary Color:**
   - Edit `--primary` in `src/index.css`
   - Rebuild: `npm run build`

2. **Add Custom Color:**
   - Add variable in `src/index.css`
   - Add to Tailwind config
   - Use in components

3. **Create New Theme:**
   - Copy light/dark blocks in `src/index.css`
   - Change OKLCH values
   - Test both modes

---

## 📚 Resources

- [shadcn/ui Docs](https://ui.shadcn.com/)
- [OKLCH Color Space](https://oklch.com/)
- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Color Module Level 4](https://www.w3.org/TR/css-color-4/)

---

**Happy Theming!** 🎨
