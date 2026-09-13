import { ToggleGroup, ToggleGroupItem } from 'orkestrator';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, LayoutGrid, Table2 } from 'lucide-react';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16 };

export function SingleSelect() {
  return (
    <div style={col}>
      <ToggleGroup type="single" defaultValue="center">
        <ToggleGroupItem value="left"><AlignLeft />Left</ToggleGroupItem>
        <ToggleGroupItem value="center"><AlignCenter />Center</ToggleGroupItem>
        <ToggleGroupItem value="right"><AlignRight />Right</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="single" defaultValue="list" variant="outline">
        <ToggleGroupItem value="list"><List />List</ToggleGroupItem>
        <ToggleGroupItem value="grid"><LayoutGrid />Grid</ToggleGroupItem>
        <ToggleGroupItem value="table"><Table2 />Table</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export function MultiSelect() {
  return (
    <div style={col}>
      <ToggleGroup type="multiple" defaultValue={["bold", "underline"]}>
        <ToggleGroupItem value="bold"><Bold /></ToggleGroupItem>
        <ToggleGroupItem value="italic"><Italic /></ToggleGroupItem>
        <ToggleGroupItem value="underline"><Underline /></ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="multiple" variant="outline" defaultValue={["bold"]}>
        <ToggleGroupItem value="bold"><Bold />Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic"><Italic />Italic</ToggleGroupItem>
        <ToggleGroupItem value="underline"><Underline />Underline</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={col}>
      <ToggleGroup type="single" size="sm" defaultValue="grid" variant="outline">
        <ToggleGroupItem value="list"><List /></ToggleGroupItem>
        <ToggleGroupItem value="grid"><LayoutGrid /></ToggleGroupItem>
        <ToggleGroupItem value="table"><Table2 /></ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="single" size="default" defaultValue="grid" variant="outline">
        <ToggleGroupItem value="list"><List /></ToggleGroupItem>
        <ToggleGroupItem value="grid"><LayoutGrid /></ToggleGroupItem>
        <ToggleGroupItem value="table"><Table2 /></ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="single" size="lg" defaultValue="grid" variant="outline">
        <ToggleGroupItem value="list"><List /></ToggleGroupItem>
        <ToggleGroupItem value="grid"><LayoutGrid /></ToggleGroupItem>
        <ToggleGroupItem value="table"><Table2 /></ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
