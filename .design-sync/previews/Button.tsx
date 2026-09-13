import { Button } from 'orkestrator';
import { Download, Plus, Trash2 } from 'lucide-react';

const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };

export function Variants() {
  return (
    <div style={row}>
      <Button>Deploy</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="link">Learn more</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={row}>
      <Button size="xs">Extra small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  );
}

export function WithIcons() {
  return (
    <div style={row}>
      <Button><Plus />New run</Button>
      <Button variant="outline"><Download />Export</Button>
      <Button variant="destructive"><Trash2 />Remove</Button>
      <Button size="icon" variant="ghost"><Plus /></Button>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={row}>
      <Button disabled>Disabled</Button>
      <Button variant="outline" disabled>Disabled</Button>
    </div>
  );
}
