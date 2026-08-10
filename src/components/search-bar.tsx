import { forwardRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar({ value, onChange }, ref) {
    const [isFocused, setIsFocused] = useState(false);
    const showShortcutHint = !value && !isFocused;

    return (
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          type="text"
          placeholder="Search tabs..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="h-8 pl-8 pr-9 text-sm outline-none focus:outline-none focus-visible:outline-none focus:border-ring/60 focus-visible:border-ring/60 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          aria-label="Search tabs"
        />
        {showShortcutHint && (
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            /
          </kbd>
        )}
      </div>
    );
  }
);
