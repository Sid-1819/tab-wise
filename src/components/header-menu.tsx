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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WORKSPACES_TOGGLE_VISIBLE } from '@/lib/features';
import { useSurfaceChoice } from '@/components/surface-switcher';
import type { SurfaceMode } from '@/lib/surface-mode';

interface HeaderMenuProps {
  surface: SurfaceMode;
  showActivity: boolean;
  onToggleActivity: (show: boolean) => void;
  /** Activity stats only apply to the Tabs view. */
  activityAvailable: boolean;
  onFeedback: () => void;
  workspacesOn: boolean;
  onToggleWorkspaces: (on: boolean) => void;
}

/** Everything that is not needed every minute lives behind one "more" button. */
export function HeaderMenu({ surface, showActivity, onToggleActivity, activityAvailable, onFeedback, workspacesOn, onToggleWorkspaces }: HeaderMenuProps) {
  const { mode, choose, openSidePanel } = useSurfaceChoice(surface);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="More options" title="More options">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuCheckboxItem checked={showActivity} disabled={!activityAvailable} onCheckedChange={onToggleActivity}>
          Activity stats
        </DropdownMenuCheckboxItem>
        {WORKSPACES_TOGGLE_VISIBLE && (
          <DropdownMenuCheckboxItem checked={workspacesOn} onCheckedChange={onToggleWorkspaces}>
            Workspaces (beta)
          </DropdownMenuCheckboxItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2 pb-0.5 pt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Toolbar icon opens
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mode} onValueChange={(m) => void choose(m as SurfaceMode)}>
          <DropdownMenuRadioItem value="sidepanel">Side panel</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="popup">Popup</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        {surface === 'popup' && (
          <DropdownMenuItem onSelect={() => void openSidePanel()}>Open side panel now</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onFeedback}>Send feedback</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
