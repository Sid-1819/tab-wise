import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: PaletteAction[];
}

export function CommandPalette({ open, onOpenChange, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setIndex(0);
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return actions;
    return actions.filter((action) => action.label.toLowerCase().includes(needle));
  }, [actions, query]);

  const activeIndex = Math.min(index, Math.max(filtered.length - 1, 0));

  const run = (action: PaletteAction | undefined) => {
    if (!action) return;
    onOpenChange(false);
    action.onSelect();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-2 p-3"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogHeader className="pr-6">
          <DialogTitle className="text-sm">Actions</DialogTitle>
          <DialogDescription className="text-xs">Run a side panel action</DialogDescription>
        </DialogHeader>
        <Input
          ref={inputRef}
          id="command-palette-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          placeholder="Filter actions..."
          aria-label="Filter actions"
          className="h-8 text-sm"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setIndex(Math.min(activeIndex + 1, Math.max(filtered.length - 1, 0)));
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setIndex(Math.max(activeIndex - 1, 0));
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              run(filtered[activeIndex]);
            }
          }}
        />
        <div role="listbox" aria-label="Actions" className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No matching actions</p>
          ) : (
            filtered.map((action, actionIndex) => (
              <button
                key={action.id}
                type="button"
                role="option"
                aria-selected={actionIndex === activeIndex}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                  actionIndex === activeIndex ? 'bg-accent text-foreground' : 'hover:bg-accent/60'
                )}
                onMouseEnter={() => setIndex(actionIndex)}
                onClick={() => run(action)}
              >
                <span className="min-w-0 truncate">{action.label}</span>
                {action.hint && (
                  <kbd className="shrink-0 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {action.hint}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
