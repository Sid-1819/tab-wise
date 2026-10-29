import { Check } from 'lucide-react';
import { GROUP_COLORS } from '@/types/tab';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  selectedColor?: string;
  onColorSelect: (color: string) => void;
}

const COLOR_NAMES: Record<string, string> = {
  '#EF4444': 'Red',
  '#F97316': 'Orange',
  '#F59E0B': 'Amber',
  '#EAB308': 'Yellow',
  '#84CC16': 'Lime',
  '#22C55E': 'Green',
  '#10B981': 'Emerald',
  '#14B8A6': 'Teal',
  '#06B6D4': 'Cyan',
  '#0EA5E9': 'Sky',
  '#3B82F6': 'Blue',
  '#6366F1': 'Indigo',
  '#8B5CF6': 'Violet',
  '#A855F7': 'Purple',
  '#D946EF': 'Fuchsia',
  '#EC4899': 'Pink',
};

function markIsDark(hex: string) {
  const value = hex.replace('#', '');
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

export function ColorPicker({ selectedColor, onColorSelect }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-y-2" role="listbox" aria-label="Group color">
      {GROUP_COLORS.map((color) => {
        const selected = selectedColor === color;
        const name = COLOR_NAMES[color] ?? color;
        return (
          <button
            key={color}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={name}
            className={cn(
              'mx-auto flex size-6 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground',
              selected && 'scale-110',
            )}
            style={{ backgroundColor: color }}
            onClick={() => onColorSelect(color)}
          >
            {selected && (
              <Check
                className={cn('size-3', markIsDark(color) ? 'text-neutral-950' : 'text-white')}
                strokeWidth={3}
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
