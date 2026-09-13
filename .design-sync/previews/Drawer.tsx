import {
  Drawer, DrawerContent, DrawerHeader, DrawerFooter,
  DrawerTitle, DrawerDescription, DrawerTrigger, DrawerClose,
  Button,
} from 'orkestrator';
import { Download } from 'lucide-react';

const option: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
  borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)',
  background: 'var(--card)',
};

export function ExportDrawer() {
  return (
    <Drawer defaultOpen direction="bottom">
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm">
          <Download size={13} />
          Export
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Export run results</DrawerTitle>
          <DrawerDescription>
            Choose a format to download the results from run #1047.
          </DrawerDescription>
        </DrawerHeader>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={option}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)' }}>CSV — Comma-separated values</span>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Compatible with Excel and Google Sheets</span>
            </div>
          </div>
          <div style={option}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)' }}>JSON — Structured data</span>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Full output including metadata</span>
            </div>
          </div>
          <div style={option}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)' }}>Parquet — Columnar format</span>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Optimised for large datasets</span>
            </div>
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DrawerClose>
          <Button size="sm">
            <Download size={13} />
            Download
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
