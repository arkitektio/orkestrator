import { Textarea } from 'orkestrator';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, width: 300 };

export function States() {
  return (
    <div style={col}>
      <Textarea placeholder="Describe your experiment…" />
      <Textarea defaultValue="Staining protocol: incubate for 30 min at RT, wash 3x PBS, apply secondary antibody." />
      <Textarea placeholder="Disabled" disabled />
    </div>
  );
}

export function Validation() {
  return (
    <div style={col}>
      <Textarea defaultValue="This field has an error." aria-invalid="true" />
    </div>
  );
}
