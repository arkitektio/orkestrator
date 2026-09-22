/**
 * The connection doctor's wire protocol — every message that crosses the
 * renderer/main boundary, in one place, with no runtime dependencies so the
 * preload and the renderer can import the types and main can import them too.
 *
 *   renderer ──ipc invoke──► main : ProbeTarget[]      ("doctor:probeNetwork")
 *   renderer ──ipc invoke──► main : (nothing)          ("doctor:probeMesh")
 *   renderer ──ipc invoke──► main : RemedyId           ("doctor:runRemedy")
 *
 * Main answers with STAGE-SHAPED results and no opinions. Every judgement —
 * "this is a tailnet address", "you are signed out of Tailscale" — is made by
 * the pure `diagnose()` in the renderer, so it can be tested without a socket.
 *
 * PRIVACY: a probe result carries hostnames, IP addresses and the tailnet name.
 * Nothing here may be attached to `src/main/issue-reporter.ts` without a
 * redaction pass first.
 */

export const DOCTOR_NETWORK_CHANNEL = "doctor:probeNetwork";
export const DOCTOR_MESH_CHANNEL = "doctor:probeMesh";
export const DOCTOR_REMEDY_CHANNEL = "doctor:runRemedy";

/** Main refuses more than this per call; the renderer batches to match. */
export const DOCTOR_MAX_TARGETS = 12;
export const DOCTOR_MIN_TIMEOUT_MS = 500;
export const DOCTOR_MAX_TIMEOUT_MS = 15000;
export const DOCTOR_DEFAULT_TIMEOUT_MS = 4000;

/**
 * One address to probe.
 *
 * Structural on purpose: this is NOT the renderer's zod `Alias`, because main
 * must not import renderer code. The renderer flattens an alias (or a
 * coordination-server URL) into this shape.
 */
export type ProbeTarget = {
  host: string;
  port?: number | null;
  ssl: boolean;
  /** `alias.path` — the prefix the service is mounted under, if any. */
  path?: string | null;
  /** `alias.challenge`, or `.well-known/fakts` when probing discovery. */
  probePath?: string | null;
  /** "mikro alias 2 of 3" — for display and for keying findings. Never in argv. */
  label?: string;
};

/**
 * DNS is resolved TWICE, and the disagreement is the point.
 *
 * `dns.lookup` goes through the OS resolver, so it sees MagicDNS; `dns.resolve`
 * talks to the configured nameservers directly and does not. lookup OK +
 * resolve NXDOMAIN means "this name only exists inside the tailnet" — which is
 * exactly how we tell a mesh address apart from a typo.
 */
export type DnsStage = {
  ok: boolean;
  /** Skipped entirely when the host is already a literal IP. */
  skipped?: boolean;
  lookupAddresses: string[];
  resolveAddresses: string[];
  lookupError?: string;
  resolveError?: string;
  code?: string;
};

export type TcpStage = {
  attempted: boolean;
  ok: boolean;
  code?: string;
  message?: string;
  ms: number;
};

export type TlsStage = {
  attempted: boolean;
  ok: boolean;
  authorizationError?: string;
  hostnameMismatch?: boolean;
  selfSigned?: boolean;
  expired?: boolean;
  /** The port accepted TCP but did not speak TLS at all. */
  notTls?: boolean;
  subject?: string;
  issuer?: string;
  validTo?: string;
  message?: string;
};

export type HttpStage = {
  attempted: boolean;
  ok: boolean;
  status?: number;
  statusText?: string;
  server?: string;
  bodySnippet?: string;
  message?: string;
  code?: string;
};

export type NetworkProbeResult = {
  target: ProbeTarget;
  /** The exact URL that was requested, so the report can show what was tried. */
  url: string;
  /**
   * Set when the host is routed through the built-in mesh: the probe went
   * through that mesh's proxy exactly like the app's own requests do. DNS
   * is then the mesh's business (skipped), TCP is the proxy's dial to the
   * peer, and TLS is not inspected (the tunnel is encrypted anyway).
   */
  viaMeshProxy?: number;
  dns: DnsStage;
  tcp: TcpStage;
  tls: TlsStage;
  http: HttpStage;
  totalMs: number;
};

export type MeshNode = {
  id?: string;
  dnsName?: string;
  hostName?: string;
  ips: string[];
  online?: boolean;
  expired?: boolean;
  keyExpiry?: string;
  os?: string;
  lastSeen?: string;
};

export type MeshUnavailableReason =
  | "cli-not-found"
  | "cli-failed"
  | "unsupported-platform";

export type MeshProbeResult =
  | {
      vendor: "tailscale";
      available: false;
      reason: MeshUnavailableReason;
      detail?: string;
    }
  | {
      vendor: "tailscale";
      available: true;
      /** "Running" | "NeedsLogin" | "Stopped" | "NoState" | anything new. */
      backendState: string;
      magicDnsSuffix?: string;
      tailnetName?: string;
      self?: MeshNode;
      peers: MeshNode[];
    };

/**
 * The closed set of things the doctor may DO. A remedy is an id, never a
 * command string from the renderer, and nothing user-supplied ever reaches an
 * argv. Growing this list is a deliberate, reviewed act.
 */
export type RemedyId = "tailscale.up" | "tailscale.open-app";

export const REMEDY_IDS: readonly RemedyId[] = [
  "tailscale.up",
  "tailscale.open-app",
] as const;

export const isRemedyId = (value: unknown): value is RemedyId =>
  typeof value === "string" && (REMEDY_IDS as readonly string[]).includes(value);

export type RemedyResult = {
  ok: boolean;
  message: string;
  /** A `https://login.tailscale.com/…` URL scraped out of `tailscale up`. */
  loginUrl?: string;
};

export type ProbeNetworkRequest = {
  targets: ProbeTarget[];
  timeoutMs?: number;
};
