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
}: GroupDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(GROUP_COLORS[0]);

  useEffect(() => {
    if (editingGroup) {
      setName(editingGroup.name);
      setColor(editingGroup.color);
    } else {
      setName('');
      setColor(GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]);
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
      isFavorite: editingGroup?.isFavorite || false,
      createdAt: editingGroup?.createdAt || Date.now(),
      lastModified: Date.now(),
    };

    onSave(group);
    onOpenChange(false);
  };

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
              : 'Create an empty custom group. Add tabs using the menu on each tab.'}
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
