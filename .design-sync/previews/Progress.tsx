import { Progress } from 'orkestrator';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: 300 };
const row: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', justifyContent: 'space-between' };

export function Levels() {
  return (
    <div style={col}>
      <div style={row}>
        <span style={{ ...label, justifyContent: 'flex-start', gap: 4 }}>
          <span style={{ color: 'var(--foreground)' }}>Idle</span>
        </span>
        <Progress value={25} />
      </div>
      <div style={row}>
        <span style={{ ...label, justifyContent: 'flex-start', gap: 4 }}>
          <span style={{ color: 'var(--foreground)' }}>Processing</span>
        </span>
        <Progress value={60} />
      </div>
      <div style={row}>
        <span style={{ ...label, justifyContent: 'flex-start', gap: 4 }}>
          <span style={{ color: 'var(--foreground)' }}>Almost done</span>
        </span>
        <Progress value={90} />
      </div>
    </div>
  );
}

export function Labeled() {
  return (
    <div style={col}>
      <div style={row}>
        <div style={label}>
          <span style={{ color: 'var(--foreground)' }}>Storage</span>
          <span>2.4 GB / 10 GB</span>
        </div>
        <Progress value={24} />
      </div>
      <div style={row}>
        <div style={label}>
          <span style={{ color: 'var(--foreground)' }}>Build cache</span>
          <span>60%</span>
        </div>
        <Progress value={60} />
      </div>
      <div style={row}>
        <div style={label}>
          <span style={{ color: 'var(--foreground)' }}>Upload</span>
          <span>890 MB / 1 GB</span>
        </div>
        <Progress value={89} />
      </div>
    </div>
  );
}
