import { Separator } from 'orkestrator';

export function Horizontal() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 280 }}>
      <span style={{ color: 'var(--foreground)', fontSize: 12 }}>Section A</span>
      <Separator />
      <span style={{ color: 'var(--foreground)', fontSize: 12 }}>Section B</span>
      <Separator />
      <span style={{ color: 'var(--foreground)', fontSize: 12 }}>Section C</span>
    </div>
  );
}

export function Vertical() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 32 }}>
      <span style={{ color: 'var(--foreground)', fontSize: 12 }}>Workflows</span>
      <Separator orientation="vertical" />
      <span style={{ color: 'var(--foreground)', fontSize: 12 }}>Nodes</span>
      <Separator orientation="vertical" />
      <span style={{ color: 'var(--foreground)', fontSize: 12 }}>Runs</span>
    </div>
  );
}

export function InList() {
  const items = ['Image segmentation', 'Cell tracking', 'Fluorescence analysis'];
  return (
    <div style={{ width: 240, display: 'flex', flexDirection: 'column' }}>
      {items.map((item, i) => (
        <div key={item}>
          <div style={{ padding: '6px 0', color: 'var(--foreground)', fontSize: 12 }}>{item}</div>
          {i < items.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}
