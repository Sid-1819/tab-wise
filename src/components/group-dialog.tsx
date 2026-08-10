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

  const handleSave = () => {
    const tabIds = editingGroup
      ? editingGroup.tabIds
      : selectedTabs.map((tab) => tab.id);

    const group: CustomGroupConfig = {
      id: editingGroup?.id || generateGroupId(),
      name: name.trim() || 'Unnamed Group',
      color,
      tabIds,
      isImportant: editingGroup?.isImportant || false,
      createdAt: editingGroup?.createdAt || Date.now(),
      lastModified: Date.now(),
    };

    onSave(group);
    onOpenChange(false);
  };

  return (
    <>
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
    </>
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
      <DialogContent className="sm:max-w-[425px]">
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
