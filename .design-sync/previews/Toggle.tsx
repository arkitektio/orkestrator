import { Toggle } from 'orkestrator';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' };
const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };

export function Variants() {
  return (
    <div style={row}>
      <Toggle defaultPressed>Bold</Toggle>
      <Toggle>Normal</Toggle>
      <Toggle variant="outline" defaultPressed>Outline on</Toggle>
      <Toggle variant="outline">Outline off</Toggle>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={row}>
      <Toggle size="sm" defaultPressed><Bold />Sm</Toggle>
      <Toggle size="default"><Bold />Default</Toggle>
      <Toggle size="lg" defaultPressed><Bold />Lg</Toggle>
    </div>
  );
}

export function WithIcons() {
  return (
    <div style={col}>
      <div style={row}>
        <Toggle defaultPressed><Bold /></Toggle>
        <Toggle><Italic /></Toggle>
        <Toggle defaultPressed><Underline /></Toggle>
      </div>
      <div style={row}>
        <Toggle variant="outline" defaultPressed><AlignLeft /></Toggle>
        <Toggle variant="outline"><AlignCenter /></Toggle>
        <Toggle variant="outline"><AlignRight /></Toggle>
      </div>
    </div>
  );
}
