import { RadioGroup, RadioGroupItem, Label } from 'orkestrator';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };

export function Basic() {
  return (
    <RadioGroup defaultValue="daily" style={{ gap: 10 }}>
      <div style={row}>
        <RadioGroupItem value="realtime" id="rg-realtime" />
        <Label htmlFor="rg-realtime">Real-time</Label>
      </div>
      <div style={row}>
        <RadioGroupItem value="daily" id="rg-daily" />
        <Label htmlFor="rg-daily">Daily digest</Label>
      </div>
      <div style={row}>
        <RadioGroupItem value="weekly" id="rg-weekly" />
        <Label htmlFor="rg-weekly">Weekly summary</Label>
      </div>
    </RadioGroup>
  );
}

export function Environment() {
  return (
    <div style={col}>
      <Label style={{ marginBottom: 4, color: 'var(--foreground)' }}>Execution environment</Label>
      <RadioGroup defaultValue="cpu">
        <div style={row}>
          <RadioGroupItem value="cpu" id="env-cpu" />
          <Label htmlFor="env-cpu">CPU only</Label>
        </div>
        <div style={row}>
          <RadioGroupItem value="gpu" id="env-gpu" />
          <Label htmlFor="env-gpu">GPU (CUDA)</Label>
        </div>
        <div style={row}>
          <RadioGroupItem value="tpu" id="env-tpu" />
          <Label htmlFor="env-tpu">TPU</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={col}>
      <Label style={{ marginBottom: 4, color: 'var(--foreground)' }}>Storage tier</Label>
      <RadioGroup defaultValue="standard">
        <div style={row}>
          <RadioGroupItem value="standard" id="tier-standard" />
          <Label htmlFor="tier-standard">Standard</Label>
        </div>
        <div style={row}>
          <RadioGroupItem value="fast" id="tier-fast" />
          <Label htmlFor="tier-fast">Fast SSD</Label>
        </div>
        <div style={row}>
          <RadioGroupItem value="archive" id="tier-archive" disabled />
          <Label htmlFor="tier-archive">Archive (unavailable)</Label>
        </div>
      </RadioGroup>
    </div>
  );
}
