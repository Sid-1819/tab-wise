import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WindowSectionProps {
  label: string;
  tabCount: number;
  focused: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onFocus: () => void;
  children: ReactNode;
}

export function WindowSection({
  label,
  tabCount,
  focused,
  collapsed,
  onToggle,
  onFocus,
  children,
}: WindowSectionProps) {
  return (
    <section className="min-w-0 space-y-1">
      <div className="flex min-w-0 items-center gap-1 px-1">
        <button
          type="button"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', collapsed && '-rotate-90')} />
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 text-left hover:bg-accent"
          onClick={onFocus}
          title="Focus this window"
        >
          <span className="truncate text-xs font-medium">
            {label}
            {focused ? ' · focused' : ''}
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {tabCount} tab{tabCount === 1 ? '' : 's'}
          </span>
        </button>
      </div>
      {!collapsed && <div className="min-w-0 space-y-1">{children}</div>}
    </section>
  );
}
