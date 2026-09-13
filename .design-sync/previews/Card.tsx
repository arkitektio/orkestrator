import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction,
  Button, Badge,
} from 'orkestrator';

export function Basic() {
  return (
    <Card style={{ width: 320 }}>
      <CardHeader>
        <CardTitle>Deployment</CardTitle>
        <CardDescription>Manage where this project is served from.</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
          Live and serving traffic from 3 regions. Last deploy 12 minutes ago.
        </p>
      </CardContent>
      <CardFooter style={{ display: 'flex', gap: 8 }}>
        <Button size="sm">Redeploy</Button>
        <Button size="sm" variant="outline">View logs</Button>
      </CardFooter>
    </Card>
  );
}

export function WithAction() {
  return (
    <Card style={{ width: 320 }}>
      <CardHeader>
        <CardTitle>Team plan</CardTitle>
        <CardDescription>Billed monthly · renews Jul 1</CardDescription>
        <CardAction><Badge>Active</Badge></CardAction>
      </CardHeader>
      <CardContent>
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>12 of 20 seats in use.</p>
      </CardContent>
    </Card>
  );
}
