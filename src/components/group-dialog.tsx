import { useState, useEffect } from 'react';
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

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (group: CustomGroupConfig) => void;
  editingGroup?: CustomGroupConfig;
  selectedTabs?: TabInfo[];
  allGroups?: CustomGroupConfig[];
}

export function GroupDialog({
  open,
  onOpenChange,
  onSave,
  editingGroup,
  selectedTabs = [],
  allGroups = [],
}: GroupDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const [parentGroupId, setParentGroupId] = useState<string>('');

  useEffect(() => {
    if (editingGroup) {
      setName(editingGroup.name);
      setColor(editingGroup.color);
      setParentGroupId(editingGroup.parentGroupId || '');
    } else {
      setName('');
      setColor(GROUP_COLORS[0]);
      setParentGroupId('');
    }
  }, [editingGroup, open]);

  const handleSave = () => {
    const tabIds = editingGroup
      ? editingGroup.tabIds
      : selectedTabs.map((tab) => tab.id);

    const group: CustomGroupConfig = {
      id: editingGroup?.id || generateGroupId(),
      name: name.trim() || 'Unnamed Group',
      color,
      tabIds,
      parentGroupId: parentGroupId || undefined,
      isFavorite: editingGroup?.isFavorite || false,
      createdAt: editingGroup?.createdAt || Date.now(),
      lastModified: Date.now(),
    };

    onSave(group);
    onOpenChange(false);
  };

  // Filter out the current group and its descendants from parent options
  const availableParentGroups = editingGroup
    ? allGroups.filter((g) => g.id !== editingGroup.id && g.parentGroupId !== editingGroup.id)
    : allGroups;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingGroup ? 'Edit Group' : 'Create Custom Group'}
          </DialogTitle>
          <DialogDescription>
            {editingGroup
              ? 'Update the group name and color.'
              : selectedTabs.length > 0
              ? `Create a custom group with ${selectedTabs.length} selected tab(s).`
              : 'Create an empty custom group. You can add tabs to it later by converting automatic groups.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              placeholder="Enter group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label>Group Color</Label>
            <ColorPicker selectedColor={color} onColorSelect={setColor} />
          </div>

          {availableParentGroups.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="parent">Parent Group (Optional)</Label>
              <select
                id="parent"
                value={parentGroupId}
                onChange={(e) => setParentGroupId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">None (Top Level)</option>
                {availableParentGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {editingGroup ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
