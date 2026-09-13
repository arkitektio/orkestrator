import {
  Sheet, SheetContent, SheetHeader, SheetFooter,
  SheetTitle, SheetDescription, SheetTrigger, SheetClose,
  Button, Label, Switch,
} from 'orkestrator';
import { Bell } from 'lucide-react';

const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8,
  borderBottom: '1px solid var(--border)',
};
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 };

export function NotificationsSheet() {
  return (
    <Sheet defaultOpen>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Bell size={13} />
          Notifications
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Notification Settings</SheetTitle>
          <SheetDescription>Choose what events you want to be notified about.</SheetDescription>
        </SheetHeader>
        <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={row}>
            <div style={label}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)' }}>Run completed</span>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>When a workflow finishes</span>
            </div>
            <Switch defaultChecked />
          </div>
          <div style={row}>
            <div style={label}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)' }}>Run failed</span>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>On errors or timeout</span>
            </div>
            <Switch defaultChecked />
          </div>
          <div style={row}>
            <div style={label}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)' }}>New deployment</span>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Agent deployed or updated</span>
            </div>
            <Switch />
          </div>
          <div style={{ ...row, borderBottom: 'none' }}>
            <div style={label}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)' }}>Weekly digest</span>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Summary every Monday</span>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" size="sm">Close</Button>
          </SheetClose>
          <Button size="sm">Save preferences</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
