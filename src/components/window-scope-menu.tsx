import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Scope = 'current' | 'all';

/** Compact "which windows" filter that sits beside the search box. */
export function WindowScopeMenu({ value, onChange }: { value: Scope; onChange: (scope: Scope) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1 px-2 text-xs"
          aria-label="Which windows to show"
          title="Which windows to show"
        >
          {value === 'current' ? 'This window' : 'All windows'}
          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as Scope)}>
          <DropdownMenuRadioItem value="current">This window</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="all">All windows</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
