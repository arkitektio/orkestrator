import { Skeleton } from 'orkestrator';

export function LoadingCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 240 }}>
      <Skeleton style={{ height: 120, width: '100%' }} />
      <Skeleton style={{ height: 14, width: '70%' }} />
      <Skeleton style={{ height: 12, width: '90%' }} />
      <Skeleton style={{ height: 12, width: '60%' }} />
    </div>
  );
}

export function LoadingList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 260 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Skeleton style={{ height: 32, width: 32, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <Skeleton style={{ height: 12, width: '75%' }} />
            <Skeleton style={{ height: 10, width: '50%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingTable() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 300 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton style={{ height: 12, width: '35%' }} />
        <Skeleton style={{ height: 12, width: '25%' }} />
        <Skeleton style={{ height: 12, width: '30%' }} />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ display: 'flex', gap: 8 }}>
          <Skeleton style={{ height: 10, width: '35%' }} />
          <Skeleton style={{ height: 10, width: '25%' }} />
          <Skeleton style={{ height: 10, width: '30%' }} />
        </div>
      ))}
    </div>
  );
}
