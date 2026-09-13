import { Tabs, TabsList, TabsTrigger, TabsContent } from 'orkestrator';

const panel: React.CSSProperties = {
  padding: '8px 2px',
  color: 'var(--muted-foreground)',
  fontSize: 12,
};

export function Default() {
  return (
    <Tabs defaultValue="overview" style={{ width: 340 }}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="metrics">Metrics</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <div style={panel}>
          <p>3 pods running · 98.7% uptime · eu-west-1</p>
          <p style={{ marginTop: 4 }}>Last deploy 12 minutes ago by ada@example.com</p>
        </div>
      </TabsContent>
      <TabsContent value="metrics">
        <div style={panel}>CPU 14% · Memory 512 MB / 2 GB · P99 latency 42 ms</div>
      </TabsContent>
      <TabsContent value="logs">
        <div style={panel}>
          <code style={{ fontSize: 11 }}>INFO [12:04:01] Request processed in 12ms</code>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export function LineVariant() {
  return (
    <Tabs defaultValue="files" style={{ width: 340 }}>
      <TabsList variant="line">
        <TabsTrigger value="files">Files</TabsTrigger>
        <TabsTrigger value="changes">Changes</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="files">
        <div style={panel}>main.py · utils.py · config.yml · requirements.txt</div>
      </TabsContent>
      <TabsContent value="changes">
        <div style={panel}>+42 lines added · -8 lines removed since last sync</div>
      </TabsContent>
      <TabsContent value="history">
        <div style={panel}>42 commits · last by grace@example.com 2h ago</div>
      </TabsContent>
    </Tabs>
  );
}

export function Vertical() {
  return (
    <Tabs defaultValue="general" orientation="vertical" style={{ width: 340 }}>
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      <TabsContent value="general">
        <div style={panel}>Project name · timezone · default region settings</div>
      </TabsContent>
      <TabsContent value="security">
        <div style={panel}>2FA enabled · API keys · audit log retention 90 days</div>
      </TabsContent>
      <TabsContent value="billing">
        <div style={panel}>Team plan · $49/mo · next invoice Jul 1, 2026</div>
      </TabsContent>
    </Tabs>
  );
}
