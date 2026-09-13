import { Kbd, KbdGroup } from 'orkestrator';

const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };
const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };

export function SingleKeys() {
  return (
    <div style={row}>
      <Kbd>⌘</Kbd>
      <Kbd>⌥</Kbd>
      <Kbd>⇧</Kbd>
      <Kbd>Ctrl</Kbd>
      <Kbd>Alt</Kbd>
      <Kbd>Enter</Kbd>
      <Kbd>Esc</Kbd>
      <Kbd>Tab</Kbd>
    </div>
  );
}

export function Combos() {
  return (
    <div style={col}>
      <div style={row}>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
        <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>Command palette</span>
      </div>
      <div style={row}>
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>S</Kbd>
        </KbdGroup>
        <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>Save</span>
      </div>
      <div style={row}>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>⇧</Kbd>
          <Kbd>P</Kbd>
        </KbdGroup>
        <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>Run pipeline</span>
      </div>
      <div style={row}>
        <KbdGroup>
          <Kbd>Alt</Kbd>
          <Kbd>F4</Kbd>
        </KbdGroup>
        <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>Close window</span>
      </div>
    </div>
  );
}
