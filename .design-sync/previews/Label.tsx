import { Label, Checkbox, Switch } from 'orkestrator';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };

export function WithCheckbox() {
  return (
    <div style={col}>
      <div style={row}>
        <Checkbox id="lbl-notify" defaultChecked />
        <Label htmlFor="lbl-notify">Email notifications</Label>
      </div>
      <div style={row}>
        <Checkbox id="lbl-sms" />
        <Label htmlFor="lbl-sms">SMS alerts</Label>
      </div>
      <div style={row}>
        <Checkbox id="lbl-push" defaultChecked />
        <Label htmlFor="lbl-push">Push notifications</Label>
      </div>
    </div>
  );
}

export function WithSwitch() {
  return (
    <div style={{ ...col, gap: 14, minWidth: 200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label htmlFor="lbl-sw1">Auto-refresh</Label>
        <Switch id="lbl-sw1" defaultChecked />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label htmlFor="lbl-sw2">Verbose logging</Label>
        <Switch id="lbl-sw2" />
      </div>
    </div>
  );
}

export function Standalone() {
  return (
    <div style={col}>
      <Label>Required field</Label>
      <Label style={{ color: 'var(--muted-foreground)' }}>Optional field</Label>
      <Label>
        <Checkbox defaultChecked style={{ marginRight: 4 }} />
        I agree to the terms and conditions
      </Label>
    </div>
  );
}
