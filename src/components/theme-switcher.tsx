import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { applyThemeWithTransition, originFromElement } from '@/lib/theme-transition';
import { cn } from '@/lib/utils';
import { useIsClient } from '@/hooks/use-is-client';

export function ThemeSwitcher() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useIsClient();
  const [animating, setAnimating] = React.useState(false);

  const isDark = mounted && resolvedTheme === 'dark';

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

    </div>
  );
}
