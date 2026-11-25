import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemePresetSub } from '@/components/theme-switcher';
import { useSurfaceChoice } from '@/components/surface-switcher';
import type { SurfaceMode } from '@/lib/surface-mode';

interface HeaderMenuProps {
  surface: SurfaceMode;
  showActivity: boolean;
  onToggleActivity: (show: boolean) => void;
  /** Activity stats only apply to the Tabs view. */
  activityAvailable: boolean;
  onFeedback: () => void;
  focusActive: boolean;
  onFocus: () => void;
}

/** Everything that is not needed every minute lives behind one "more" button. */
export function HeaderMenu({
  surface,
  showActivity,
  onToggleActivity,
  activityAvailable,
  onFeedback,
  focusActive,
  onFocus,
}: HeaderMenuProps) {
  const { mode, choose, openSidePanel } = useSurfaceChoice(surface);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="More options" title="More options">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={onFocus}>{focusActive ? 'End focus mode' : 'Start focus mode…'}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={showActivity} disabled={!activityAvailable} onCheckedChange={onToggleActivity}>
          Activity stats
        </DropdownMenuCheckboxItem>
        <ThemePresetSub />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Toolbar icon opens</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuRadioGroup value={mode} onValueChange={(m) => void choose(m as SurfaceMode)}>
              <DropdownMenuRadioItem value="sidepanel">Side panel</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="popup">Popup</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            {surface === 'popup' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void openSidePanel()}>Open side panel now</DropdownMenuItem>
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="sr-only">Help</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onFeedback}>Send feedback or report a bug</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
