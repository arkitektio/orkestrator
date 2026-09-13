import { Switch, Label } from 'orkestrator';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };

export function States() {
  return (
    <div style={col}>
      <div style={row}>
        <Switch id="off" />
        <Label htmlFor="off">Disabled (off)</Label>
      </div>
      <div style={row}>
        <Switch id="on" defaultChecked />
        <Label htmlFor="on">Enabled (on)</Label>
      </div>
      <div style={row}>
        <Switch id="locked" disabled />
        <Label htmlFor="locked">Locked off</Label>
      </div>
      <div style={row}>
        <Switch id="locked-on" defaultChecked disabled />
        <Label htmlFor="locked-on">Locked on</Label>
      </div>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={col}>
      <div style={row}>
        <Switch size="sm" defaultChecked />
        <Label>Small</Label>
      </div>
      <div style={row}>
        <Switch size="default" defaultChecked />
        <Label>Default</Label>
      </div>
      <div style={row}>
        <Switch size="sm" />
        <Label>Small off</Label>
      </div>
      <div style={row}>
        <Switch size="default" />
        <Label>Default off</Label>
      </div>
    </div>
  );
}

export function SettingsPanel() {
  return (
    <div style={{ ...col, gap: 14, minWidth: 220 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label>Dark mode</Label>
        <Switch defaultChecked />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label>Auto-save</Label>
        <Switch defaultChecked />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label>Telemetry</Label>
        <Switch />
      </div>
    </div>
  );
}
