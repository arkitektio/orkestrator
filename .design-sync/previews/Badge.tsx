import { Badge } from 'orkestrator';
import { CheckCircle2, AlertTriangle, Clock, XCircle, Tag } from 'lucide-react';

const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };

export function Variants() {
  return (
    <div style={row}>
      <Badge variant="default">Active</Badge>
      <Badge variant="secondary">Queued</Badge>
      <Badge variant="destructive">Failed</Badge>
      <Badge variant="outline">Draft</Badge>
      <Badge variant="ghost">Archived</Badge>
      <Badge variant="link">Linked</Badge>
    </div>
  );
}

export function StatusBadges() {
  return (
    <div style={row}>
      <Badge variant="default"><CheckCircle2 />Running</Badge>
      <Badge variant="secondary"><Clock />Pending</Badge>
      <Badge variant="destructive"><XCircle />Error</Badge>
      <Badge variant="outline"><AlertTriangle />Warning</Badge>
    </div>
  );
}

export function Labels() {
  return (
    <div style={row}>
      <Badge variant="default"><Tag />production</Badge>
      <Badge variant="secondary"><Tag />staging</Badge>
      <Badge variant="outline"><Tag />preview</Badge>
      <Badge variant="ghost"><Tag />experimental</Badge>
    </div>
  );
}

export function InContext() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--foreground)' }}>api-gateway</span>
        <Badge variant="default">Running</Badge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--foreground)' }}>ml-inference</span>
        <Badge variant="secondary">Pending</Badge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--foreground)' }}>data-pipeline</span>
        <Badge variant="destructive">Failed</Badge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--foreground)' }}>worker-queue</span>
        <Badge variant="outline">Draft</Badge>
      </div>
    </div>
  );
}
