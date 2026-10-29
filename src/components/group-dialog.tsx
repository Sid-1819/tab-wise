import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '@/components/color-picker';
import { CustomGroupConfig, TabInfo, GROUP_COLORS } from '@/types/tab';
import { generateGroupId } from '@/lib/group-storage';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (group: CustomGroupConfig) => void;
  editingGroup?: CustomGroupConfig;
  selectedTabs?: TabInfo[];
  allGroups?: CustomGroupConfig[];
}

interface GroupDialogFormProps {
  editingGroup?: CustomGroupConfig;
  selectedTabs: TabInfo[];
  onSave: (group: CustomGroupConfig) => void;
  onOpenChange: (open: boolean) => void;
}

function GroupDialogForm({
  editingGroup,
  selectedTabs,
  onSave,
  onOpenChange,
}: GroupDialogFormProps) {
  const [name, setName] = useState(() => editingGroup?.name ?? '');
  const [color, setColor] = useState(
    () => editingGroup?.color ?? GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)],
  );

  const trimmedName = name.trim();

  const handleSave = () => {
    if (!trimmedName) return;

    const tabIds = editingGroup
      ? editingGroup.tabIds
      : selectedTabs.map((tab) => tab.id);

    const group: CustomGroupConfig = {
      id: editingGroup?.id || generateGroupId(),
      name: trimmedName,
      color,
      tabIds,
      isImportant: editingGroup?.isImportant || false,
      createdAt: editingGroup?.createdAt || Date.now(),
      lastModified: Date.now(),
    };

    onSave(group);
    onOpenChange(false);
  };

  const description = editingGroup
    ? 'Update the name and color.'
    : selectedTabs.length > 0
      ? `Starts with ${selectedTabs.length} selected ${selectedTabs.length === 1 ? 'tab' : 'tabs'}.`
      : 'Starts empty. Add tabs from the menu on each tab.';

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
    >
      <div className="h-1 rounded-t-xl" style={{ backgroundColor: color }} aria-hidden />

      <div className="grid gap-4 px-4 pb-4 pt-3.5">
        <DialogHeader className="pr-7">
          <DialogTitle className="text-[15px]">
            {editingGroup ? 'Edit group' : 'New group'}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label htmlFor="name" className="text-xs text-muted-foreground">
            Name
          </Label>
          <Input
            id="name"
            placeholder="Work, research, reading…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            autoComplete="off"
            className="h-9 rounded-lg bg-background"
          />
        </div>

        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">Color</Label>
          <ColorPicker selectedColor={color} onColorSelect={setColor} />
        </div>

        <div
          className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2"
          style={{ borderLeftColor: color, borderLeftWidth: 3 }}
        >
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <span
            className={cn(
              'min-w-0 truncate text-sm',
              trimmedName ? 'font-medium' : 'text-muted-foreground',
            )}
          >
            {trimmedName || 'Untitled group'}
          </span>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" className="h-8 px-3.5 text-xs" disabled={!trimmedName}>
            {editingGroup ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </div>
    </form>
  );
}

export function GroupDialog({
  open,
  onOpenChange,
  onSave,
  editingGroup,
  selectedTabs = [],
}: GroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0">
        <GroupDialogForm
          key={`${editingGroup?.id ?? 'new'}-${open}`}
          editingGroup={editingGroup}
          selectedTabs={selectedTabs}
          onSave={onSave}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}
