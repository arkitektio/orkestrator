import {
  Dialog, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription, DialogTrigger, DialogClose,
  Button, Input, Label,
} from 'orkestrator';
import { Settings2 } from 'lucide-react';

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const fields: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 };

export function SettingsDialog() {
  return (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 size={13} />
          Workspace settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workspace Settings</DialogTitle>
          <DialogDescription>
            Configure your workspace preferences. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>
        <div style={fields}>
          <div style={field}>
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input id="ws-name" defaultValue="Production Cluster" />
          </div>
          <div style={field}>
            <Label htmlFor="ws-slug">URL slug</Label>
            <Input id="ws-slug" defaultValue="prod-cluster" />
          </div>
          <div style={field}>
            <Label htmlFor="ws-desc">Description</Label>
            <Input id="ws-desc" placeholder="Optional description…" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
