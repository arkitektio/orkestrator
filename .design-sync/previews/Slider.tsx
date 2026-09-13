import { Slider, Label } from 'orkestrator';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16 };
const fieldRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };

export function Basic() {
  return (
    <div style={{ ...col, width: 280 }}>
      <div style={fieldRow}>
        <Label>Volume</Label>
        <Slider defaultValue={[60]} min={0} max={100} />
      </div>
      <div style={fieldRow}>
        <Label>Brightness</Label>
        <Slider defaultValue={[30]} min={0} max={100} />
      </div>
    </div>
  );
}

export function RangeSlider() {
  return (
    <div style={{ ...col, width: 280 }}>
      <div style={fieldRow}>
        <Label>Price range</Label>
        <Slider defaultValue={[20, 75]} min={0} max={100} />
      </div>
      <div style={fieldRow}>
        <Label>Confidence threshold</Label>
        <Slider defaultValue={[40, 90]} min={0} max={100} />
      </div>
    </div>
  );
}

export function DisabledState() {
  return (
    <div style={{ ...col, width: 280 }}>
      <div style={fieldRow}>
        <Label>Zoom level (locked)</Label>
        <Slider defaultValue={[50]} min={0} max={100} disabled />
      </div>
      <div style={fieldRow}>
        <Label>Step size</Label>
        <Slider defaultValue={[25]} min={0} max={100} step={25} />
      </div>
    </div>
  );
}
