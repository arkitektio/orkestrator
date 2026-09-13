import {
  Table, TableHeader, TableBody, TableFooter,
  TableHead, TableRow, TableCell, TableCaption,
  Badge,
} from 'orkestrator';

export function Deployments() {
  const rows = [
    { name: 'api-gateway', status: 'Running', region: 'eu-west-1', updated: '2 min ago', variant: 'default' as const },
    { name: 'worker-queue', status: 'Running', region: 'us-east-1', updated: '14 min ago', variant: 'default' as const },
    { name: 'ml-inference', status: 'Pending', region: 'ap-south-1', updated: '1 hr ago', variant: 'secondary' as const },
    { name: 'data-pipeline', status: 'Failed', region: 'eu-central-1', updated: '3 hr ago', variant: 'destructive' as const },
  ];
  return (
    <Table>
      <TableCaption>Active deployments across all regions</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(r => (
          <TableRow key={r.name}>
            <TableCell style={{ fontWeight: 500 }}>{r.name}</TableCell>
            <TableCell><Badge variant={r.variant}>{r.status}</Badge></TableCell>
            <TableCell style={{ color: 'var(--muted-foreground)' }}>{r.region}</TableCell>
            <TableCell style={{ color: 'var(--muted-foreground)' }}>{r.updated}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell>4 deployments</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

export function UserRoster() {
  const users = [
    { name: 'Ada Lovelace', role: 'Admin', email: 'ada@example.com', joined: 'Jan 2024' },
    { name: 'Grace Hopper', role: 'Member', email: 'grace@example.com', joined: 'Mar 2024' },
    { name: 'Linus Torvalds', role: 'Owner', email: 'linus@example.com', joined: 'Dec 2023' },
  ];
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Joined</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(u => (
          <TableRow key={u.email}>
            <TableCell style={{ fontWeight: 500 }}>{u.name}</TableCell>
            <TableCell>{u.role}</TableCell>
            <TableCell style={{ color: 'var(--muted-foreground)' }}>{u.email}</TableCell>
            <TableCell style={{ color: 'var(--muted-foreground)' }}>{u.joined}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
