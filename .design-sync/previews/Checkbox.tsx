import { Checkbox, Label } from 'orkestrator';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 };

export function States() {
  return (
    <div style={col}>
      <div style={row}>
        <Checkbox id="unchecked" />
        <Label htmlFor="unchecked">Unchecked</Label>
      </div>
      <div style={row}>
        <Checkbox id="checked" defaultChecked />
        <Label htmlFor="checked">Checked</Label>
      </div>
      <div style={row}>
        <Checkbox id="disabled" disabled />
        <Label htmlFor="disabled">Disabled</Label>
      </div>
      <div style={row}>
        <Checkbox id="disabled-checked" defaultChecked disabled />
        <Label htmlFor="disabled-checked">Disabled + checked</Label>
      </div>
    </div>
  );
}

export function WithLabels() {
  return (
    <div style={col}>
      <div style={row}>
        <Checkbox id="notifications" defaultChecked />
        <Label htmlFor="notifications">Email notifications</Label>
      </div>
      <div style={row}>
        <Checkbox id="analytics" />
        <Label htmlFor="analytics">Usage analytics</Label>
      </div>
      <div style={row}>
        <Checkbox id="updates" defaultChecked />
        <Label htmlFor="updates">Automatic updates</Label>
      </div>
    </div>
  );
}

export function IndeterminateStates() {
  return (
    <div style={col}>
      <div style={row}>
        <Checkbox id="select-all" checked="indeterminate" />
        <Label htmlFor="select-all">Select all runs</Label>
      </div>
      <div style={{ ...col, paddingLeft: 20, gap: 8 }}>
        <div style={row}>
          <Checkbox id="run1" defaultChecked />
          <Label htmlFor="run1">Run #1042</Label>
        </div>
        <div style={row}>
          <Checkbox id="run2" />
          <Label htmlFor="run2">Run #1043</Label>
        </div>
      </div>
    </div>
  );
}
