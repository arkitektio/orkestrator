import { StatusPulse } from 'orkestrator';

const row: React.CSSProperties = {
  display: 'flex',
  gap: 20,
  alignItems: 'center',
  flexWrap: 'wrap',
};

const item: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  color: 'var(--foreground)',
};

export function States() {
  return (
    <div style={row}>
      <div style={item}>
        <StatusPulse color="green-500" />
        <span>Online</span>
      </div>
      <div style={item}>
        <StatusPulse color="yellow-500" />
        <span>Idle</span>
      </div>
      <div style={item}>
        <StatusPulse color="red-500" />
        <span>Offline</span>
      </div>
    </div>
  );
}

export function InContext() {
  const services = [
    { name: 'API gateway', color: 'green-500' },
    { name: 'Worker pool', color: 'green-500' },
    { name: 'Job queue', color: 'yellow-500' },
    { name: 'Storage', color: 'red-500' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200 }}>
      {services.map((s) => (
        <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--foreground)' }}>{s.name}</span>
          <StatusPulse color={s.color} />
        </div>
      ))}
    </div>
  );
}
