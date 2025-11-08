import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  totalTabs: number;
  totalGroups: number;
}

export function SearchBar({ value, onChange, totalTabs, totalGroups }: SearchBarProps) {
  return (
    <div className="space-y-2 mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search tabs..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {totalTabs} tabs in {totalGroups} groups
      </div>
    </div>
  );
}
