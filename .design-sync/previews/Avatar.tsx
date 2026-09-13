import {
  Avatar, AvatarImage, AvatarFallback,
  AvatarBadge, AvatarGroup, AvatarGroupCount,
} from 'orkestrator';
import { Bot } from 'lucide-react';

const row: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' };

export function Sizes() {
  return (
    <div style={row}>
      <Avatar size="sm">
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>
      <Avatar size="default">
        <AvatarFallback>GH</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>LT</AvatarFallback>
      </Avatar>
    </div>
  );
}

export function WithBadge() {
  return (
    <div style={row}>
      <Avatar size="default">
        <AvatarFallback>AL</AvatarFallback>
        <AvatarBadge />
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>GH</AvatarFallback>
        <AvatarBadge><Bot /></AvatarBadge>
      </Avatar>
      <Avatar size="sm">
        <AvatarFallback>LT</AvatarFallback>
        <AvatarBadge />
      </Avatar>
    </div>
  );
}

export function Group() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>GH</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>LT</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+5</AvatarGroupCount>
      </AvatarGroup>
      <AvatarGroup>
        <Avatar size="sm">
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
        <Avatar size="sm">
          <AvatarFallback>RS</AvatarFallback>
        </Avatar>
        <Avatar size="sm">
          <AvatarFallback>KL</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+2</AvatarGroupCount>
      </AvatarGroup>
    </div>
  );
}

export function Fallbacks() {
  const people = [
    { initials: 'AL', label: 'Ada Lovelace' },
    { initials: 'GH', label: 'Grace Hopper' },
    { initials: 'LT', label: 'Linus Torvalds' },
    { initials: 'DK', label: 'Donald Knuth' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {people.map(p => (
        <div key={p.initials} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size="sm">
            <AvatarImage src="" alt={p.label} />
            <AvatarFallback>{p.initials}</AvatarFallback>
          </Avatar>
          <span style={{ fontSize: 12, color: 'var(--foreground)' }}>{p.label}</span>
        </div>
      ))}
    </div>
  );
}
