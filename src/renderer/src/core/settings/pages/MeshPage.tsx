import { Arkitekt } from "@/core/app/Arkitekt";
import { StatusDot, TONE_TEXT, type Tone } from "../components/StatusLabel";
import { meshAliases } from "@/core/lib/mesh/meshNeed";
import { profileTitle } from "@/core/app/components/profile/profileLabels";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/core/components/ui/alert-dialog";
import { Button } from "@/core/components/ui/button";
import { Checkbox } from "@/core/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Textarea } from "@/core/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Switch } from "@/core/components/ui/switch";
import type { ProfileMesh } from "@/core/lib/arkitekt/fakts/profileStorageSchema";
import { useMeshes } from "@/core/lib/mesh/useMeshes";
import { cn } from "@/core/lib/utils";
import { AlertTriangle, Check, Clock, Copy, Loader2, Lock, Network, Radio, RotateCw, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  isLockPublicKey,
  MESH_LOCK_MAX_TRUSTED_KEYS,
  type MeshLockInitResult,
  type MeshLockPeer,
  type MeshLockSignResult,
  type MeshLockStatus,
  type MeshNodeState,
  type MeshNodeStatus,
  type MeshPeer,
  type MeshPingResult,
} from "../../../../../main/mesh/protocol";
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
 * pinged the way `tailscale ping` does, and can forget the mesh (the next
 * sign-in to this profile brings it back). A deployment's hosts route through
 * the mesh on their own when they sit under its control server's domain.
 *
 * Tailnet Lock has its own card while the node runs. The mesh server's
 * administrator has to enable it for the mesh first; until then the card says
 * so and offers "Check again". Once enabled, this computer can set it up:
 * become the key authority, sign every machine already on the mesh, and hand
 * the user the disablement secret once. With the lock on, the card shows
 * whether this computer is signed and, for a trusted signer, the machines
 * waiting for approval, each approvable here. Changing who may sign later
 * stays with the tailscale CLI.
 */

const STATE: Record<MeshNodeState, { label: string; tone: Tone }> = {
  stopped: { label: "Not running", tone: "bad" },
  starting: { label: "Connecting", tone: "warn" },
  "needs-login": { label: "Membership lapsed", tone: "bad" },
  "needs-machine-auth": { label: "Awaiting approval", tone: "warn" },
  running: { label: "Connected", tone: "good" },
  error: { label: "Error", tone: "bad" },
};

export const MeshPage = () => {
  const mesh = useMeshes();
  const profile = Arkitekt.useActiveProfile();
  const setProfileMesh = Arkitekt.useSetProfileMesh();
  const own = profile?.mesh;
  const snapshot = own ? mesh.meshes.find((candidate) => candidate.config.id === own.id) : undefined;
  // The hub's addresses that live on the mesh — none means it has no reason to run.
  const carried = meshAliases(profile?.session.fakts, own);

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

      {own && carried.length === 0 && <Notice icon={Network}>{NOT_NEEDED}</Notice>}

      {own && (
        <MeshCard
          mesh={own}
          carried={carried}
          owner={profileTitle(profile)}
          status={snapshot?.status}
          pings={mesh.pings}
          onToggle={(enabled) => void update((current) => ({ ...current, enabled }))}
          onPing={(target) => void mesh.ping(own.id, target)}
          onApprove={(nodeKey) => mesh.lockSign(own.id, nodeKey)}
          onLockInit={(trustedKeys) => mesh.lockInit(own.id, trustedKeys)}
          onRecheck={async () => {
            const error = await mesh.restart();
            if (error) toast.error(error);
          }}
          onRemove={() => void setProfileMesh(profile.id, () => undefined)}
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

const NOT_NEEDED =
  "None of this hub's services have an address on the mesh — they are all reached directly, so the mesh stays off. It starts on its own as soon as the hub offers one.";

const MeshCard = ({
  mesh,
  carried,
  owner,
  status,
  pings,
  onToggle,
  onPing,
  onApprove,
  onLockInit,
  onRecheck,
  onRemove,
}: {
  mesh: ProfileMesh;
  /** The hub's addresses that go through this mesh; empty = it has no reason to run. */
  carried: string[];
  /** The profile it belongs to, as the switcher names it. */
  owner: string;
  /** Undefined until main reports on this window's claim. */
  status?: MeshNodeStatus;
  pings: Record<string, MeshPingResult>;
  onToggle: (enabled: boolean) => void;
  onPing: (target: string) => void;
  onApprove: (nodeKey: string) => Promise<MeshLockSignResult>;
  onLockInit: (trustedKeys: string[]) => Promise<MeshLockInitResult>;
  onRecheck: () => Promise<void>;
  onRemove: () => void;
}) => {
  const { enabled } = mesh;
  const needed = carried.length > 0;
  const nodeState: MeshNodeState = status?.state ?? "starting";
  const running = enabled && nodeState === "running";
  const peers = running ? [...(status?.peers ?? [])] : [];
  const online = peers.filter((peer) => peer.online).length;
  // Parked because nothing of this hub lives on it — not a fault. (While the
  // node joins once to register, its real state shows instead.)
  const parked = enabled && !needed && !running && nodeState !== "starting";
  const state = !enabled
    ? { label: "Off", tone: "muted" as Tone }
    : parked
      ? { label: "Not needed", tone: "muted" as Tone }
      : STATE[nodeState];
  const lock = running && status?.lock?.enabled ? status.lock : undefined;

  return (
    <>
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
                  <StatusDot tone={state.tone} pulse={enabled && !parked && nodeState === "starting"} />
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
              title={
                lock?.trusted
                  ? "Forget this mesh — the next sign-in brings it back. This computer is a Tailnet Lock signer: if that sign-in makes a new node, its signing key is left behind, so make sure another signer exists."
                  : "Forget this mesh — the next sign-in to this profile brings it back"
              }
              onClick={onRemove}
            >
              <Trash2 className="size-3.5" />
            </Button>
            <span title={needed ? undefined : NOT_NEEDED}>
              <Switch
                checked={enabled}
                onCheckedChange={onToggle}
                disabled={!needed}
                aria-label={enabled ? "Switch this mesh off" : "Switch this mesh on"}
              />
            </span>
          </div>

          {!enabled && (
            <p className="text-xs text-muted-foreground">
              Nothing is routed through it, and signing in again does not ask to join.
            </p>
          )}

          {enabled && needed && (
            <p className="truncate text-xs text-muted-foreground" title={carried.join(", ")}>
              Carries {carried.join(", ")}
            </p>
          )}

          {enabled && !parked && status && <StateLine status={status} />}

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
        </CardContent>
      </Card>

      {running && status && (
        <LockCard
          status={status}
          meshLabel={mesh.label}
          machines={peers.length}
          onApprove={onApprove}
          onLockInit={onLockInit}
          onRecheck={onRecheck}
        />
      )}
    </>
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

/** Copies a value; the icon flips to a check for a moment. */
const CopyButton = ({ value, title }: { value: string; title: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-6 shrink-0 text-muted-foreground"
      title={title}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => toast.error("Could not copy to the clipboard"),
        );
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  );
};

/**
 * This computer is cut off by Tailnet Lock: it reaches no machine until a
 * signer signs it. The command is the one `tailscale lock status` prints, with
 * our lock key as the rotation key so later key rotations need no re-approval.
 */
const LockedOut = ({ lock }: { lock: MeshLockStatus }) => {
  const command = lock.nodeKey
    ? `tailscale lock sign ${lock.nodeKey}${lock.publicKey ? ` ${lock.publicKey}` : ""}`
    : undefined;
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-sm text-destructive">
        <AlertTriangle className="size-3.5 shrink-0" />
        On, and this computer is not signed yet, so it can't reach any machine.
        {command && " Ask someone who can sign to run:"}
      </p>
      {command && (
        <div className="flex items-center gap-1 rounded bg-muted py-1 pr-1 pl-2">
          <code className="min-w-0 flex-1 truncate font-mono text-[11px]" title={command}>
            {command}
          </code>
          <CopyButton value={command} title="Copy the command" />
        </div>
      )}
    </div>
  );
};

/**
 * Tailnet Lock, on its own card: a new machine reaches nobody until a signer
 * approves it. The mesh server's administrator has to enable it for the mesh
 * first; until then there is nothing to set up here, only "Check again".
 */
const LockCard = ({
  status,
  meshLabel,
  machines,
  onApprove,
  onLockInit,
  onRecheck,
}: {
  status: MeshNodeStatus;
  meshLabel: string;
  machines: number;
  onApprove: (nodeKey: string) => Promise<MeshLockSignResult>;
  onLockInit: (trustedKeys: string[]) => Promise<MeshLockInitResult>;
  onRecheck: () => Promise<void>;
}) => {
  const lock = status.lock;
  const pending = lock?.enabled && lock.trusted ? (lock.pending ?? []) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-4" />
          Tailnet Lock
        </CardTitle>
        <CardDescription>
          With the lock on, a new machine reaches nobody on the mesh until a signer approves it. The mesh
          server's administrator has to enable it for this mesh first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lock?.enabled ? (
          lock.signed ? (
            <LockSigned lock={lock} />
          ) : (
            <LockedOut lock={lock} />
          )
        ) : lock?.allowed ? (
          <LockSetup lock={lock} meshLabel={meshLabel} machines={machines} onInit={onLockInit} />
        ) : (
          <LockRecheck onRecheck={onRecheck} />
        )}

        {pending.length > 0 && (
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Waiting for approval</div>
            <ul className="-mx-2">
              {pending.map((peer) => (
                <PendingRow key={peer.nodeKey} peer={peer} meshLabel={meshLabel} onApprove={onApprove} />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/** Signed: whether this computer may also approve others, and its key for a signer. */
const LockSigned = ({ lock }: { lock: MeshLockStatus }) => (
  <div className="flex items-center gap-1.5 text-sm">
    <ShieldCheck className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
    <span className="min-w-0 flex-1">
      {lock.trusted ? "On. This computer is a signer and can approve new machines." : "On. This computer is signed."}
    </span>
    {lock.publicKey && (
      <CopyButton
        value={lock.publicKey}
        title={
          lock.trusted
            ? `Copy this computer's lock key (${lock.publicKey})`
            : `Copy this computer's lock key (${lock.publicKey}). Someone who can sign adds it with \`tailscale lock add\` to let this computer approve machines.`
        }
      />
    )}
  </div>
);

/**
 * Tailnet Lock is available but not set up: this computer can become the key
 * authority. The dialog runs in three steps — who to trust, the init itself
 * (which signs every machine already on the mesh), and the disablement secret,
 * which is shown once and has to be acknowledged before the dialog closes.
 */
const LockSetup = ({
  lock,
  meshLabel,
  machines,
  onInit,
}: {
  lock: MeshLockStatus;
  meshLabel: string;
  machines: number;
  onInit: (trustedKeys: string[]) => Promise<MeshLockInitResult>;
}) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"trust" | "working" | "secret">("trust");
  const [extra, setExtra] = useState("");
  const [error, setError] = useState<string>();
  const [secrets, setSecrets] = useState<string[]>([]);
  const [stored, setStored] = useState(false);

  const others = [...new Set(extra.split(/[\s,]+/).map((key) => key.trim().toLowerCase()).filter(Boolean))].filter(
    (key) => key !== lock.publicKey,
  );
  const invalid = others.filter((key) => !isLockPublicKey(key));
  const tooMany = others.length > MESH_LOCK_MAX_TRUSTED_KEYS;
  /** Closing is refused mid-init and until the secret has been acknowledged. */
  const locked = step === "working" || (step === "secret" && !stored);

  const reset = () => {
    setStep("trust");
    setExtra("");
    setError(undefined);
    setSecrets([]);
    setStored(false);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const run = async () => {
    setError(undefined);
    setStep("working");
    const result = await onInit(others);
    if (result.ok && result.disablementSecrets?.length) {
      setSecrets(result.disablementSecrets);
      setStep("secret");
    } else if (result.ok) {
      close();
      toast.success("Tailnet Lock is set up.");
    } else {
      setError(result.error ?? "Tailnet Lock could not be set up.");
      setStep("trust");
    }
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <p className="min-w-0 flex-1 text-muted-foreground">
        Enabled for this mesh but not set up yet. Setting it up makes this computer a signer.
      </p>
      <Button size="sm" variant="outline" className="shrink-0" onClick={() => setOpen(true)}>
        Set up
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) setOpen(true);
          else if (!locked) close();
        }}
      >
        <DialogContent
          className="sm:max-w-lg"
          showCloseButton={!locked}
          onInteractOutside={(event) => locked && event.preventDefault()}
          onEscapeKeyDown={(event) => locked && event.preventDefault()}
        >
          {step === "secret" ? (
            <>
              <DialogHeader>
                <DialogTitle>Store the disablement secret</DialogTitle>
                <DialogDescription>
                  Tailnet Lock is on for {meshLabel}. This secret is the only way to switch it off again, for instance
                  if every signer is lost. It is not stored anywhere and will not be shown again, so keep it in a
                  password manager.
                </DialogDescription>
              </DialogHeader>
              {secrets.map((secret) => (
                <div key={secret} className="flex items-center gap-1 rounded bg-muted py-1 pr-1 pl-2">
                  <code className="min-w-0 flex-1 font-mono text-[11px] break-all">{secret}</code>
                  <CopyButton value={secret} title="Copy the disablement secret" />
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={stored} onCheckedChange={(checked) => setStored(checked === true)} />
                I have stored the secret somewhere safe
              </label>
              <DialogFooter>
                <Button disabled={!stored} onClick={close}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Set up Tailnet Lock</DialogTitle>
                <DialogDescription>
                  This computer becomes a signer for {meshLabel}.{" "}
                  {machines === 1
                    ? "The machine already on the mesh is approved now; "
                    : machines > 1
                      ? `The ${machines} machines already on the mesh are approved now; `
                      : ""}
                  from then on every new machine has to be approved by a signer before it can reach anything.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">
                  Other signers <span className="text-muted-foreground/70">(optional, recommended)</span>
                </div>
                <Textarea
                  value={extra}
                  onChange={(event) => setExtra(event.target.value)}
                  placeholder="tlpub:…  one per line, from `tailscale lock` on each machine"
                  className="min-h-20 font-mono text-xs"
                  disabled={step === "working"}
                />
                <p className={cn("text-xs", invalid.length || tooMany ? "text-destructive" : "text-muted-foreground")}>
                  {invalid.length
                    ? `Not a lock key: ${invalid[0]}`
                    : tooMany
                      ? `At most ${MESH_LOCK_MAX_TRUSTED_KEYS} other signers.`
                      : "If this computer is the only signer and loses its mesh identity, nobody can approve machines until the lock is switched off with the disablement secret."}
                </p>
              </div>
              {error && (
                <p className="flex items-start gap-1.5 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button variant="ghost" disabled={step === "working"} onClick={close}>
                  Cancel
                </Button>
                <Button
                  disabled={step === "working" || invalid.length > 0 || tooMany}
                  onClick={() => void run()}
                  className="gap-1.5"
                >
                  {step === "working" && <Loader2 className="size-3.5 animate-spin" />}
                  {step === "working" ? "Signing machines…" : "Turn on Tailnet Lock"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/**
 * Tailnet Lock is neither on nor available. An administrator may just have
 * granted it; the node normally notices within seconds, and "Check again"
 * restarts the mesh client for when it has not.
 */
const LockRecheck = ({ onRecheck }: { onRecheck: () => Promise<void> }) => {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="min-w-0 flex-1">
        Not enabled for this mesh. Ask the mesh server's administrator to enable Tailnet Lock, then check again.
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1.5 px-2 text-xs"
        disabled={busy}
        title="Restarts the mesh client and reconnects, so it picks up anything an administrator changed. Mesh traffic pauses for a few seconds."
        onClick={() => {
          setBusy(true);
          void onRecheck().finally(() => setBusy(false));
        }}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
        Check again
      </Button>
    </div>
  );
};

/** A machine Tailnet Lock keeps out, with an approve that asks first. */
const PendingRow = ({
  peer,
  meshLabel,
  onApprove,
}: {
  peer: MeshLockPeer;
  meshLabel: string;
  onApprove: (nodeKey: string) => Promise<MeshLockSignResult>;
}) => {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = peer.name?.split(".")[0] || peer.ips[0] || "Unnamed machine";

  const approve = async () => {
    setBusy(true);
    const result = await onApprove(peer.nodeKey);
    setBusy(false);
    if (result.ok) toast.success(`${name} can now reach the mesh.`);
    else toast.error(result.error ?? `Could not approve ${name}.`);
  };

  return (
    <li className="group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
      <StatusDot tone="warn" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm" title={peer.name}>
          {name}
        </div>
        <div className="truncate font-mono text-xs text-muted-foreground/70" title={peer.nodeKey}>
          {peer.ips[0] ?? peer.nodeKey}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className={cn(
          "h-7 gap-1.5 px-2 text-xs transition-opacity",
          !busy && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
        onClick={() => setConfirming(true)}
        disabled={busy}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
        Approve
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be able to reach every machine on {meshLabel}. Only approve a machine you expect to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void approve()}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
};

export default MeshPage;
