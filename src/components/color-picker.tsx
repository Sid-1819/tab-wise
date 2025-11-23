import { GROUP_COLORS } from '@/types/tab';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  selectedColor?: string;
  onColorSelect: (color: string) => void;
}

export function ColorPicker({ selectedColor, onColorSelect }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {GROUP_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={cn(
            "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
            selectedColor === color
              ? "border-foreground ring-2 ring-offset-2 ring-foreground"
              : "border-transparent"
          )}
          style={{ backgroundColor: color }}
          onClick={() => onColorSelect(color)}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  );
}
