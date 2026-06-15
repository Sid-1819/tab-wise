import { Moon, Sun, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { THEME_PRESETS, useThemePreset } from '@/components/theme-provider';
import { applyPresetWithTransition, applyThemeWithTransition, originFromElement } from '@/lib/theme-transition';
import { cn } from '@/lib/utils';

export function ThemeSwitcher() {
  const { setTheme, resolvedTheme } = useTheme();
  const { preset, setPreset } = useThemePreset();
  const [mounted, setMounted] = React.useState(false);
  const [animating, setAnimating] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  const paletteRef = React.useRef<HTMLButtonElement>(null);

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnimating(true);
    applyThemeWithTransition(
      setTheme,
      isDark ? 'light' : 'dark',
      originFromElement(event.currentTarget)
    );
    window.setTimeout(() => setAnimating(false), 500);
  };

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
        onClick={toggleTheme}
      >
        <span className="relative flex size-3.5 items-center justify-center">
          <Sun
            className={cn(
              'absolute size-3.5 transition-all duration-[400ms] ease-out',
              isDark
                ? 'rotate-90 scale-0 opacity-0'
                : 'rotate-0 scale-100 opacity-100',
              animating && !isDark && 'rotate-180'
            )}
          />
          <Moon
            className={cn(
              'absolute size-3.5 transition-all duration-[400ms] ease-out',
              isDark
                ? 'rotate-0 scale-100 opacity-100'
                : '-rotate-90 scale-0 opacity-0',
              animating && isDark && 'rotate-12'
            )}
          />
        </span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={paletteRef}
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Theme preset"
            title="Theme preset"
          >
            <Palette className="size-3.5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Preset</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={preset}
            onValueChange={(id) => {
              const origin = paletteRef.current
                ? originFromElement(paletteRef.current)
                : undefined;
              applyPresetWithTransition(() => setPreset(id), origin);
            }}
          >
            {THEME_PRESETS.map((p) => (
              <DropdownMenuRadioItem key={p.id} value={p.id}>
                {p.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
