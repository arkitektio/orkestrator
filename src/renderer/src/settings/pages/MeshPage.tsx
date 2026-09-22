import { Arkitekt } from "@/app/Arkitekt";
import { profileTitle } from "@/app/components/profile/profileLabels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { ProfileMesh } from "@/lib/arkitekt/fakts/profileStorageSchema";
import { useMeshes } from "@/lib/mesh/useMeshes";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, Loader2, Network, Radio, Route, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { MeshNodeState, MeshNodeStatus, MeshPeer, MeshPingResult } from "../../../../main/mesh/protocol";
import { SettingsPage } from "../components/SettingsPage";

/**
 * The organisation mesh of the profile this window is signed in to.
 *
 * A mesh belongs to a profile — organisation and hub — and lives on it; this
 * page never adds one. Membership comes with signing in: the login asks for
 * it, and if the approver allows it the tokens bring a one-shot key and the
 * built-in node joins. From then on the mesh is up whenever a window is in
 * this profile, unless it is switched off here; off, nothing is routed and a
 * re-approval does not ask for a key.
 *
 * Shows what is connected, what it routes, which machines are on it and how
 * this computer reaches each — directly or through a relay — lets a machine be
 * pinged the way `tailscale ping` does, lets the deployment's addresses be
 * pinned to the mesh when they are not under its name space, and can forget
 * the mesh (the next sign-in to this profile brings it back).
 */

type Tone = "good" | "warn" | "bad" | "muted";

const TONE_TEXT: Record<Tone, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  bad: "text-destructive",
  muted: "text-muted-foreground",
};

const TONE_DOT: Record<Tone, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-destructive",
  muted: "bg-muted-foreground/40",
};

const STATE: Record<MeshNodeState, { label: string; tone: Tone }> = {
  stopped: { label: "Not running", tone: "bad" },
  starting: { label: "Connecting", tone: "warn" },
  "needs-login": { label: "Membership lapsed", tone: "bad" },
  "needs-machine-auth": { label: "Awaiting approval", tone: "warn" },
  running: { label: "Connected", tone: "good" },
  error: { label: "Error", tone: "bad" },
};

const StatusDot = ({ tone, pulse }: { tone: Tone; pulse?: boolean }) => (
  <span aria-hidden className="relative flex size-2 shrink-0">
    {pulse && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", TONE_DOT[tone])} />}
    <span className={cn("relative size-2 rounded-full", TONE_DOT[tone])} />
  </span>
);

export const MeshPage = () => {
  const mesh = useMeshes();
  const fakts = Arkitekt.useFakts();
  const profile = Arkitekt.useActiveProfile();
  const setProfileMesh = Arkitekt.useSetProfileMesh();
  const own = profile?.mesh;
  const snapshot = own ? mesh.meshes.find((candidate) => candidate.config.id === own.id) : undefined;

  /** Every host this deployment advertises — for pinning to the mesh. */
  const deploymentHosts = [
    ...new Set(
      Object.values(fakts?.instances ?? {}).flatMap((instance) => instance.aliases.map((alias) => alias.host)),
    ),
  ];

  if (!mesh.available || !profile) {
    return (
      <SettingsPage slug="mesh">
        <Notice icon={Network}>
          {mesh.available ? "Sign in to see your organisation's mesh." : "Meshes need the desktop app."}
        </Notice>
      </SettingsPage>
    );
  }

  const update = (change: (current: ProfileMesh) => ProfileMesh | undefined) =>
    setProfileMesh(profile.id, (current) => (current ? change(current) : current));

  return (
    <SettingsPage slug="mesh">
      {own?.enabled && mesh.sidecar.state === "unavailable" && (
        <Notice icon={AlertTriangle} tone="warn">
          {mesh.sidecar.reason === "binary-missing"
            ? "This build ships without the built-in mesh client, so organisation meshes cannot be joined."
            : `The mesh client could not be started${mesh.sidecar.detail ? `: ${mesh.sidecar.detail}` : "."}`}
        </Notice>
      )}

      {own?.enabled && mesh.sidecar.state === "crashed" && (
        <Notice icon={AlertTriangle} tone="bad">
          The mesh client stopped unexpectedly ({mesh.sidecar.detail}). Restarting Orkestrator starts it again.
        </Notice>
      )}

      {mesh.error && (
        <Notice icon={AlertTriangle} tone="bad">
          {mesh.error}
        </Notice>
      )}

      {!own && (
        <Notice icon={Network}>
          {profile.session.endpoint.mesh_coord_url
            ? "This deployment has a mesh, but this profile was not let into it when you signed in. Signing in again asks once more."
            : "This organisation has no mesh. Its services are reached directly."}
        </Notice>
      )}

      {own && (
        <MeshCard
          mesh={own}
          owner={profileTitle(profile)}
          status={snapshot?.status}
          deploymentHosts={deploymentHosts}
          pings={mesh.pings}
          onToggle={(enabled) => void update((current) => ({ ...current, enabled }))}
          onPing={(target) => void mesh.ping(own.id, target)}
          onRemove={() => void setProfileMesh(profile.id, () => undefined)}
          onPinDeployment={() => {
            void update((current) => ({
              ...current,
              hosts: [...new Set([...current.hosts, ...deploymentHosts.map((host) => host.toLowerCase())])],
            })).then(() => toast.success("This deployment's addresses now route through the mesh."));
          }}
        />
      )}
    </SettingsPage>
  );
};

/** A one-line message with an icon; no card, just a quiet bordered strip. */
const Notice = ({
  icon: Icon,
  tone = "muted",
  children,
}: {
  icon: typeof Network;
  tone?: Tone;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
      tone === "muted" && "border-dashed text-muted-foreground",
      tone === "warn" && "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
      tone === "bad" && "border-destructive/30 bg-destructive/5 text-destructive",
    )}
  >
    <Icon className="mt-0.5 size-4 shrink-0" />
    <p>{children}</p>
  </div>
);

const MeshCard = ({
  mesh,
  owner,
  status,
  deploymentHosts,
  pings,
  onToggle,
  onPing,
  onRemove,
  onPinDeployment,
}: {
  mesh: ProfileMesh;
  /** The profile it belongs to, as the switcher names it. */
  owner: string;
  /** Undefined until main reports on this window's claim. */
  status?: MeshNodeStatus;
  deploymentHosts: string[];
  pings: Record<string, MeshPingResult>;
  onToggle: (enabled: boolean) => void;
  onPing: (target: string) => void;
  onRemove: () => void;
  onPinDeployment: () => void;
}) => {
  const { enabled } = mesh;
  const nodeState: MeshNodeState = status?.state ?? "starting";
  const running = enabled && nodeState === "running";
  const peers = running ? [...(status?.peers ?? [])] : [];
  const online = peers.filter((peer) => peer.online).length;
  const unpinned = deploymentHosts.filter((host) => !mesh.hosts.includes(host.toLowerCase()));
  const state = enabled ? STATE[nodeState] : { label: "Off", tone: "muted" as Tone };

  return (
    <Card className="gap-0 py-0">
      <CardContent className="space-y-4 p-4">
        {/* Name, one status, whose it is; the switch on the side. */}
        <div className="group flex items-center gap-3">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-md bg-muted",
              !enabled && "text-muted-foreground",
            )}
          >
            <Network className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("truncate font-medium", !enabled && "text-muted-foreground")}>{mesh.label}</span>
              <span className={cn("flex shrink-0 items-center gap-1.5 text-xs", TONE_TEXT[state.tone])}>
                <StatusDot tone={state.tone} pulse={enabled && nodeState === "starting"} />
                {state.label}
              </span>
            </div>
            <div className="truncate text-xs text-muted-foreground" title={mesh.controlUrl}>
              {owner}
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
            title="Forget this mesh — the next sign-in to this profile brings it back"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            aria-label={enabled ? "Switch this mesh off" : "Switch this mesh on"}
          />
        </div>

        {!enabled && (
          <p className="text-xs text-muted-foreground">
            Nothing is routed through it, and signing in again does not ask to join.
          </p>
        )}

        {enabled && status && <StateLine status={status} />}

        {running && status && (
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <Fact label="This computer" value={status.selfDnsName ?? status.selfIps?.[0]} mono />
            <Fact label="Routes" value={status.magicDnsSuffix && `*.${status.magicDnsSuffix}`} mono />
            <Fact label="Machines" value={`${online} of ${peers.length} online`} />
          </dl>
        )}

        {enabled && mesh.hosts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted-foreground">Also routes</span>
            {mesh.hosts.map((host) => (
              <span key={host} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                {host}
              </span>
            ))}
          </div>
        )}

        {peers.length > 0 && (
          <ul className="-mx-2">
            {peers
              .sort((a, b) => Number(b.online) - Number(a.online) || (a.dnsName ?? "").localeCompare(b.dnsName ?? ""))
              .map((peer) => (
                <PeerRow
                  key={peer.dnsName ?? peer.ips[0]}
                  peer={peer}
                  ping={peer.ips[0] ? pings[`${mesh.id}::${peer.ips[0]}`] : undefined}
                  onPing={peer.ips[0] ? () => onPing(peer.ips[0]) : undefined}
                />
              ))}
          </ul>
        )}

        {running && unpinned.length > 0 && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onPinDeployment}>
            <Route className="size-3.5" />
            Route this deployment's addresses here
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

/** What the state means for the user, when it is not simply "connected". */
const StateLine = ({ status }: { status: MeshNodeStatus }) => {
  switch (status.state) {
    case "needs-login":
      return (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertTriangle className="size-3.5 shrink-0" />
          Membership has lapsed. Sign out of this profile and sign in again to rejoin.
        </p>
      );
    case "needs-machine-auth":
      return (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-3.5 shrink-0" />
          Joined; an administrator of this mesh has to approve this computer first.
        </p>
      );
    case "stopped":
      return (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertTriangle className="size-3.5 shrink-0" />
          Not running. Switching it off and on, or restarting Orkestrator, reconnects it.
        </p>
      );
    case "error":
      return (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertTriangle className="size-3.5 shrink-0" />
          {status.error}
        </p>
      );
    default:
      return null;
  }
};

const Fact = ({ label, value, mono }: { label: string; value?: string; mono?: boolean }) =>
  value ? (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("truncate", mono && "font-mono text-xs leading-5")} title={value}>
        {value}
      </dd>
    </div>
  ) : null;

/** How this computer reaches the peer right now, from the node's own view. */
const pathOf = (peer: MeshPeer): { label: string; tone: Tone } => {
  if (!peer.online) return { label: "offline", tone: "muted" };
  if (peer.curAddr) return { label: `direct · ${peer.curAddr}`, tone: "good" };
  if (peer.relay) return { label: `relayed · ${peer.relay}`, tone: "warn" };
  if (peer.active) return { label: "connected", tone: "good" };
  return { label: "idle", tone: "muted" };
};

const pingSummary = (ping: MeshPingResult): { label: string; tone: Tone } => {
  if (!ping.final && ping.attempt === 0) return { label: "pinging…", tone: "muted" };
  if (ping.error && ping.final) return { label: ping.error, tone: "bad" };
  if (!ping.ok) return { label: `attempt ${ping.attempt}…`, tone: "muted" };
  const ms = ping.latencyMs === undefined ? "" : `${ping.latencyMs < 10 ? ping.latencyMs.toFixed(1) : Math.round(ping.latencyMs)} ms`;
  if (ping.direct) return { label: `${ms} direct via ${ping.endpoint}`, tone: "good" };
  const via = ping.derpRegion ? ` via ${ping.derpRegion}` : "";
  return { label: `${ms} relayed${via}${ping.final ? "" : ` (attempt ${ping.attempt})`}`, tone: "warn" };
};

const PeerRow = ({ peer, ping, onPing }: { peer: MeshPeer; ping?: MeshPingResult; onPing?: () => void }) => {
  const path = pathOf(peer);
  const pinging = !!ping && !ping.final;
  const pinged = ping && pingSummary(ping);
  return (
    <li className="group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
      <StatusDot tone={peer.expired ? "bad" : peer.online ? "good" : "muted"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn("truncate text-sm", !peer.online && "text-muted-foreground")}>
            {peer.hostName ?? peer.dnsName ?? peer.ips[0]}
          </span>
          {peer.os && <span className="shrink-0 text-xs text-muted-foreground/70">{peer.os}</span>}
          {peer.expired && <span className="shrink-0 text-xs text-destructive">key expired</span>}
        </div>
        <div className="flex min-w-0 items-baseline gap-x-2 text-xs">
          <span className="shrink-0 font-mono text-muted-foreground/70" title={peer.dnsName}>
            {peer.ips[0]}
          </span>
          <span className={cn("truncate", TONE_TEXT[path.tone])}>{path.label}</span>
          {pinged && <span className={cn("truncate", TONE_TEXT[pinged.tone])}>· {pinged.label}</span>}
        </div>
      </div>
      {onPing && peer.online && (
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            "h-7 gap-1.5 px-2 text-xs transition-opacity",
            !pinging && !ping && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
          onClick={onPing}
          disabled={pinging}
          title="Ping, like `tailscale ping`"
        >
          {pinging ? <Loader2 className="size-3.5 animate-spin" /> : <Radio className="size-3.5" />}
          Ping
        </Button>
      )}
    </li>
  );
};

export default MeshPage;
