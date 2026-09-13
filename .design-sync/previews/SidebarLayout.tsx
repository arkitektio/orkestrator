import { SidebarLayout, Item, ItemContent, ItemTitle, ItemDescription, ItemMedia, Input } from 'orkestrator';
import { Search, Box, GitBranch, Database, Settings } from 'lucide-react';

const navItems = [
  { icon: Box, label: 'Deployments', desc: '3 active', },
  { icon: GitBranch, label: 'Branches', desc: '12 open PRs', },
  { icon: Database, label: 'Storage', desc: '2.4 GB used', },
  { icon: Settings, label: 'Settings', desc: 'General & team', },
];

export function Basic() {
  return (
    <div style={{ height: 360, width: 280, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <SidebarLayout
        searchBar={
          <div style={{ position: 'relative', width: '100%' }}>
            <Search style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--muted-foreground)' }} />
            <Input placeholder="Search..." style={{ paddingLeft: 28, height: 32, fontSize: 12 }} />
          </div>
        }
        bottomBar={
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted-foreground)' }}>
            4 services connected
          </div>
        }
      >
        {navItems.map(({ icon: Icon, label, desc }) => (
          <Item key={label} variant="default" size="sm" style={{ cursor: 'pointer' }}>
            <ItemMedia variant="icon">
              <Icon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{label}</ItemTitle>
              <ItemDescription>{desc}</ItemDescription>
            </ItemContent>
          </Item>
        ))}
      </SidebarLayout>
    </div>
  );
}
