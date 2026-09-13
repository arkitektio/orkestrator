import {
  Popover, PopoverContent, PopoverTrigger,
  PopoverHeader, PopoverTitle, PopoverDescription,
  Button, Input, Label,
} from 'orkestrator';
import { Share2, Copy, Check } from 'lucide-react';

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const divider: React.CSSProperties = { height: 1, background: 'var(--border)', margin: '8px 0' };

export function SharePopover() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2 size={13} />
            Share
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="center">
          <PopoverHeader>
            <PopoverTitle>Share workflow</PopoverTitle>
            <PopoverDescription>Invite collaborators by link or email.</PopoverDescription>
          </PopoverHeader>
          <div style={divider} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={field}>
              <Label htmlFor="share-link" style={{ fontSize: 11 }}>Shareable link</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input
                  id="share-link"
                  readOnly
                  defaultValue="https://app.orkestrator.io/w/abc123"
                  style={{ fontSize: 11 }}
                />
                <Button variant="ghost" size="icon-sm" title="Copy">
                  <Copy size={13} />
                </Button>
              </div>
            </div>
            <div style={field}>
              <Label htmlFor="share-email" style={{ fontSize: 11 }}>Invite by email</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input id="share-email" placeholder="colleague@example.com" style={{ fontSize: 11 }} />
                <Button size="sm" style={{ whiteSpace: 'nowrap' }}>Invite</Button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted-foreground)', fontSize: 11 }}>
              <Check size={12} style={{ color: 'var(--primary)' }} />
              Link sharing is enabled
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
