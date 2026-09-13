import { FancyInput } from 'orkestrator';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: 280 };

export function States() {
  return (
    <div style={col}>
      <FancyInput placeholder="Search experiments…" />
      <FancyInput defaultValue="workflow-v2" />
      <FancyInput placeholder="Disabled" disabled />
    </div>
  );
}

export function Types() {
  return (
    <div style={col}>
      <FancyInput type="email" placeholder="researcher@lab.org" />
      <FancyInput type="password" defaultValue="secret-token" />
    </div>
  );
}
