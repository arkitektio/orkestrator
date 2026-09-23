/**
 * The mesh sidecar's wire protocol — every message that crosses one of its
 * boundaries, in one place, with no runtime dependencies so the preload and
 * the renderer can import the types and main can import the guards.
 *
 *   renderer ──ipc invoke──► main (MeshService) : MeshConfig, mesh ids   ("mesh:*")
 *   main     ──ipc send────► every renderer      : MeshEvent               ("mesh:event")
 *   main     ──stdin───────► meshd (Go, tsnet)   : MeshdCommand   (newline JSON)
 *   meshd    ──stdout──────► main                : MeshdEvent     (newline JSON)
 *
 * A "mesh" is one organisation's tailnet: one control server URL, one node
 * identity for this computer, one local proxy port. The sidecar hosts every
 * mesh in a single process; the app routes a deployment's hosts to the right
 * one with a PAC script (see `pac.ts`).
 *
 * PRIVACY: a status carries the tailnet name, peer names and addresses, and
 * (in `lock`) the names and addresses of machines waiting for approval.
 * SECRET: a `lock-init` answer carries the lock's disablement secrets. They go
 * back only to the window that asked (as the invoke result), are never
 * broadcast, logged or stored, and are shown to the user exactly once.
 * Nothing here may be attached to `src/main/issue-reporter.ts` without a
 * redaction pass first.
 */

export const MESH_EVENT_CHANNEL = "mesh:event";
export const MESH_STATUS_CHANNEL = "mesh:status";
export const MESH_CLAIM_CHANNEL = "mesh:claim";
export const MESH_PING_CHANNEL = "mesh:ping";
export const MESH_LOCK_SIGN_CHANNEL = "mesh:lock-sign";
export const MESH_LOCK_INIT_CHANNEL = "mesh:lock-init";
export const MESH_RESTART_CHANNEL = "mesh:restart";

/**
 * One organisation mesh. It belongs to a PROFILE (organisation + hub), not to
 * the device: the renderer keeps it on the profile record in its profile book
 * (`StoredProfile.mesh`), and main never persists it. Main only runs what the
 * open windows claim (see `MeshClaimRequest`); the node's identity lives in
 * `<userData>/mesh/<id>/`, so the id travels with the profile.
 */
export type MeshConfig = {
  /** Stable id, minted once per profile's mesh; names the node's state directory. */
  id: string;
  /** "My Lab" — shown in settings and the doctor. */
  label: string;
  /**
   * The coordination server, e.g. an ionscale instance. Must be https (or
   * http for a loopback dev server); the sidecar refuses anything else.
   */
  controlUrl: string;
  /**
   * Alias hosts explicitly routed through this mesh, on top of everything
   * under its MagicDNS suffix. Lets a deployment that advertises bare labels
   * or raw 100.x addresses be pinned to one mesh when two overlap.
   */
  hosts: string[];
};

/**
 * A window saying which mesh its active profile needs: the profile's mesh
 * when it has one and it is switched on, else `null`. Main runs the union of
 * every open window's claim and drops a window's claim when it closes, so a
 * mesh is up exactly while some window is in its profile.
 *
 * `authKey` is a ONE-SHOT credential that came with a grant: used for this
 * connect and never stored. lok mints one per grant, it expires within
 * minutes, and once the node has logged in its own state carries it across
 * restarts. A node without a key or state reports `needs-login`, which means
 * "sign in to the deployment again" — never a browser flow of its own.
 */
export type MeshClaimRequest = {
  mesh: MeshConfig | null;
  authKey?: string;
};

export type MeshNodeState =
  | "stopped"
  | "starting"
  | "needs-login"
  | "needs-machine-auth"
  | "running"
  | "error";

export type MeshPeer = {
  dnsName?: string;
  hostName?: string;
  ips: string[];
  online: boolean;
  expired?: boolean;
  os?: string;
  /** Direct endpoint ("ip:port") traffic currently takes, if any and if direct. */
  curAddr?: string;
  /** The DERP relay region traffic currently goes through, if relayed. */
  relay?: string;
  /** Whether there is a live WireGuard session with this peer right now. */
  active?: boolean;
  lastHandshake?: string;
};

/**
 * One attempt of a disco ping (what `tailscale ping` does): reachability,
 * latency, and whether the reply came over a direct path or a DERP relay.
 * `final` marks the attempt the sidecar stopped at (direct, or out of tries).
 */
export type MeshPingResult = {
  target: string;
  attempt: number;
  final: boolean;
  ok: boolean;
  latencyMs?: number;
  direct: boolean;
  endpoint?: string;
  derpRegion?: string;
  nodeName?: string;
  error?: string;
};

export type MeshPingRequest = {
  meshId: string;
  /** One of the mesh's peer addresses, as the status lists them. */
  target: string;
};

/** A machine Tailnet Lock keeps cut off until a signer approves it. */
export type MeshLockPeer = {
  /** "nodekey:…" — what gets signed. */
  nodeKey: string;
  /** Its MagicDNS name, without the trailing dot. */
  name?: string;
  ips: string[];
};

/**
 * Tailnet Lock, as this node sees it. With the lock on, a machine reaches
 * nobody until a trusted signer signs its node key. Machines waiting for that
 * are not among `peers` (they are dropped from the netmap) — only in `pending`.
 */
export type MeshLockStatus = {
  /**
   * The coordination server lets this computer set the lock up (an
   * administrator switched Tailnet Lock on for the mesh there). Only matters
   * while `enabled` is false.
   */
  allowed: boolean;
  enabled: boolean;
  /** This computer is authorised; if not, it is cut off from every machine. */
  signed: boolean;
  /** This computer's lock key is trusted, so it may approve other machines. */
  trusted: boolean;
  /** "tlpub:…" — shared with a signer for `tailscale lock add` / `sign`. */
  publicKey?: string;
  /** "nodekey:…" — this computer's node key. */
  nodeKey?: string;
  pending?: MeshLockPeer[];
};

export type MeshLockSignRequest = {
  meshId: string;
  /** One of the mesh's `lock.pending` node keys, as the status lists them. */
  nodeKey: string;
};

export type MeshLockSignResult = { ok: boolean; error?: string };

/** "tlpub:" + 64 hex — a Tailnet Lock public key as `tailscale lock` prints it. */
export const isLockPublicKey = (value: string): boolean => /^tlpub:[0-9a-f]{64}$/.test(value);

export const MESH_LOCK_MAX_TRUSTED_KEYS = 15;

/**
 * Make this computer the mesh's key authority (`tailscale lock init`). This
 * computer's own key is always trusted; `trustedKeys` adds other signers.
 */
export type MeshLockInitRequest = {
  meshId: string;
  trustedKeys: string[];
};

export type MeshLockInitResult = {
  ok: boolean;
  error?: string;
  /** "disablement-secret:…" — the only way to switch the lock off again. See SECRET above. */
  disablementSecrets?: string[];
};

/** One node's full status; the sidecar re-sends the whole thing on change. */
export type MeshNodeStatus = {
  id: string;
  state: MeshNodeState;
  /** The SOCKS5 + HTTP CONNECT proxy on 127.0.0.1. */
  proxyPort?: number;
  /** "lab.mesh.arkitekt.live" — everything under it routes here. */
  magicDnsSuffix?: string;
  tailnetName?: string;
  selfIps?: string[];
  selfDnsName?: string;
  peers?: MeshPeer[];
  /** Absent when the node could not tell (no lock support on either side). */
  lock?: MeshLockStatus;
  error?: string;
};

/** What the renderer sees: the configuration and, if any, its live status. */
export type MeshSnapshot = {
  config: MeshConfig & {
    /**
     * The node has logged in before and kept its identity on disk, so a
     * plain connect will do — no key or sign-in needed. This is what decides
     * whether a grant asks lok for a fresh key.
     */
    hasNodeState: boolean;
  };
  status: MeshNodeStatus;
};

export type MeshSidecarState =
  | { state: "idle" }
  | { state: "starting" }
  | { state: "ready"; version: string }
  | { state: "unavailable"; reason: "binary-missing" | "spawn-failed"; detail?: string }
  | { state: "crashed"; detail: string };

/** Every mesh some window currently claims — each window picks out its own. */
export type MeshStatusPayload = {
  sidecar: MeshSidecarState;
  meshes: MeshSnapshot[];
};

export type MeshEvent =
  | { type: "status"; payload: MeshStatusPayload }
  | { type: "ping"; meshId: string; result: MeshPingResult }
  | { type: "log"; meshId: string; message: string };

/* ───────────────────────── sidecar (Go) protocol ───────────────────────── */

export type MeshdCommand =
  | { op: "connect"; id: string; dir: string; controlUrl: string; hostname: string; authKey?: string }
  | { op: "disconnect"; id: string }
  | { op: "ping"; id: string; target: string }
  | { op: "lock-sign"; id: string; nodeKey: string }
  | { op: "lock-init"; id: string; trustedKeys: string[] }
  | { op: "status" }
  | { op: "shutdown" };

export type MeshdEvent =
  | { ev: "ready"; version: string }
  | ({ ev: "status" } & MeshNodeStatus)
  | ({ ev: "ping"; id: string } & MeshPingResult)
  | ({ ev: "lock-sign"; id: string; nodeKey: string } & MeshLockSignResult)
  | ({ ev: "lock-init"; id: string } & MeshLockInitResult)
  | { ev: "log"; id: string; message: string }
  | { ev: "error"; id: string; message: string };

/** Parse one stdout line. Anything that is not a known event is dropped. */
export const parseMeshdLine = (line: string): MeshdEvent | undefined => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch {
    return undefined;
  }
  if (!value || typeof value !== "object") return undefined;
  const ev = (value as { ev?: unknown }).ev;
  if (ev === "ready" || ev === "status" || ev === "ping" || ev === "lock-sign" || ev === "lock-init" || ev === "log" || ev === "error") {
    return value as MeshdEvent;
  }
  return undefined;
};

/**
 * A control URL the sidecar will accept. https only, except plain http to a
 * loopback address for a dev server. No userinfo, no query, no fragment: the
 * value ends up in a request to a coordination server, so keep it plain.
 */
export const isValidControlUrl = (value: string): boolean => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password || url.search || url.hash) return false;
  if (url.protocol === "https:") return true;
  if (url.protocol === "http:") {
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  }
  return false;
};

/**
 * A hostname the PAC script may route: lowercase DNS label(s) or an IP
 * literal. Rejects anything that could break out of the generated script.
 */
export const isRoutableHost = (value: string): boolean =>
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(value) ||
  /^[0-9a-f:.]+$/i.test(value);

export const normalizeHost = (value: string): string => value.trim().toLowerCase().replace(/\.$/, "");

/**
 * The domain a mesh's control server names its tailnets under: the control
 * URL's host, when it is a real multi-label name (not an IP, not `localhost`).
 */
export const controlDomain = (controlUrl: string): string | undefined => {
  let host: string;
  try {
    host = normalizeHost(new URL(controlUrl).hostname);
  } catch {
    return undefined;
  }
  if (!host.includes(".") || /^[0-9.]+$/.test(host) || host.includes(":")) return undefined;
  return isRoutableHost(host) ? host : undefined;
};

const isString = (value: unknown): value is string => typeof value === "string";

/** Accept only a well-formed mesh; anything else is refused, not repaired. */
export const sanitizeMeshConfig = (value: unknown): MeshConfig | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  if (!isString(raw.id) || !/^[A-Za-z0-9_-]{1,64}$/.test(raw.id)) return undefined;
  if (!isString(raw.label) || !isString(raw.controlUrl) || !isValidControlUrl(raw.controlUrl)) return undefined;
  const hosts = Array.isArray(raw.hosts)
    ? raw.hosts.filter(isString).map(normalizeHost).filter(isRoutableHost)
    : [];
  return {
    id: raw.id,
    label: raw.label.trim() || raw.id,
    controlUrl: raw.controlUrl,
    hosts: [...new Set(hosts)],
  };
};
