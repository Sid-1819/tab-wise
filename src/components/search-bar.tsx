import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative mb-2">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search tabs..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 pl-8 text-sm"
        aria-label="Search tabs"
      />
    </div>
  );
}
