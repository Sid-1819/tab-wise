import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export type ThemePreset = {
  id: string;
  label: string;
  className: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'default', label: 'Default', className: '' },
  { id: 'sage', label: 'Sage', className: 'theme-sage' },
];

const PRESET_STORAGE_KEY = 'tab-wise-theme-preset';

type PresetContextValue = {
  preset: string;
  setPreset: (id: string) => void;
};

const PresetContext = React.createContext<PresetContextValue | null>(null);

function PresetProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPresetState] = React.useState<string>('default');

  React.useEffect(() => {
    const stored =
      typeof window !== 'undefined' ? window.localStorage.getItem(PRESET_STORAGE_KEY) : null;
    if (stored && THEME_PRESETS.some((p) => p.id === stored)) {
      setPresetState(stored);
    }
  }, []);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    THEME_PRESETS.forEach((p) => {
      if (p.className) root.classList.remove(p.className);
    });
    const active = THEME_PRESETS.find((p) => p.id === preset);
    if (active?.className) root.classList.add(active.className);
  }, [preset]);

  const setPreset = React.useCallback((id: string) => {
    setPresetState(id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PRESET_STORAGE_KEY, id);
    }
  }, []);

  return (
    <PresetContext.Provider value={{ preset, setPreset }}>{children}</PresetContext.Provider>
  );
}

export function useThemePreset() {
  const ctx = React.useContext(PresetContext);
  if (!ctx) throw new Error('useThemePreset must be used inside ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="tab-wise-theme"
    >
      <PresetProvider>{children}</PresetProvider>
    </NextThemesProvider>
  );
}
