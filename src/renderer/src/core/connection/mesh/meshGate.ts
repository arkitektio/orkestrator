import type { ProfileMesh } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { classifyHost } from "@/core/connection/arkitekt/doctor/classify";
import { controlDomain, type MeshNodeStatus, type MeshStatusPayload } from "../../../../../main/mesh/protocol";
import type { MeshBridge } from "./bridge";
import { createMeshStatusStore, meshStatusStore, type MeshStatusStore } from "./meshStatusStore";

/**
 * When may a service behind the mesh be checked?
 *
 * The node is claimed at mount (`MeshSync`) or joined with a key
 * (`joinMesh`), and takes seconds to get in; the aliases behind it used to be
 * probed in that window, time out, and be marked invalid — with nothing ever
 * checking again once the mesh came up. A gate watches the active profile's
 * node and says when it is `running` with a proxy (main applies the routing
 * BEFORE it broadcasts that, so traffic is routed by then), when it has
 * definitively failed, or that it gave up waiting. It never claims anything
 * itself: there is exactly one claimer per window. It reads the window's
 * status store (`meshStatusStore.ts`), so a gate opens no subscription.
 *
 * A node joining with a key reads `starting` until the key lands or is
 * refused — main hides the NeedsLogin tsnet passes through meanwhile — so a
 * join never fails a gate early.
 *
 * `onRunning` keeps firing on every later transition into `running`, so a mesh
 * that drops and comes back gets its services re-checked.
 */

export type GateOutcome = "running" | "failed" | "timeout" | "none";

export type MeshGate = {
  /** The mesh this gate watches; null for "no mesh in play". */
  meshId: string | null;
  /** Settles once: the first time the node runs, fails, or the wait runs out. */
  ready: Promise<GateOutcome>;
  isRunning: () => boolean;
  /** How `ready` settled, once it has. */
  outcome: () => GateOutcome | undefined;
  onRunning: (listener: (status: MeshNodeStatus) => void) => () => void;
  dispose: () => void;
};

/**
 * From the claim — not from the first check — so the time Windows' firewall
 * explainer is open does not count; it covers the sidecar starting (its own
 * budget is 15 s) and the node logging in.
 */
export const MESH_GATE_TIMEOUT_MS = 30_000;

/** No mesh, a switched-off one, or a build without the sidecar: nothing to wait for. */
export const NO_MESH_GATE: MeshGate = {
  meshId: null,
  ready: Promise.resolve("none"),
  isRunning: () => false,
  outcome: () => "none",
  onRunning: () => () => {},
  dispose: () => {},
};

/**
 * States the node will not leave by itself soon. `needs-machine-auth` too:
 * the services must not wait on an administrator; `onRunning` re-checks them
 * once the node is approved.
 */
const FAILED_STATES = new Set<MeshNodeStatus["state"]>(["needs-login", "needs-machine-auth", "error"]);

export const watchMesh = (
  mesh: ProfileMesh | undefined,
  {
    bridge,
    store = bridge ? createMeshStatusStore(bridge) : meshStatusStore(),
    timeoutMs = MESH_GATE_TIMEOUT_MS,
    clockStarts = Promise.resolve(),
  }: {
    /** Tests: watch this bridge through a store of its own. */
    bridge?: MeshBridge;
    store?: MeshStatusStore;
    timeoutMs?: number;
    /** When the timeout starts counting: once the claim is on its way. */
    clockStarts?: Promise<void>;
  } = {},
): MeshGate => {
  if (!mesh?.enabled || !store.available) return NO_MESH_GATE;

  let running = false;
  let settled: GateOutcome | undefined;
  /** The node has been seen moving: a later `stopped` is a stop, not "not yet". */
  let moved = false;
  let settle: (outcome: GateOutcome) => void = () => {};
  const ready = new Promise<GateOutcome>((resolve) => {
    settle = (outcome) => {
      if (settled) return;
      settled = outcome;
      resolve(outcome);
    };
  });
  const listeners = new Set<(status: MeshNodeStatus) => void>();

  const handle = (payload: MeshStatusPayload) => {
    if (payload.sidecar.state === "unavailable" || payload.sidecar.state === "crashed") {
      running = false;
      settle("failed");
      return;
    }
    const status = payload.meshes.find((snapshot) => snapshot.config.id === mesh.id)?.status;
    // Not claimed yet (the claim is on its way): keep waiting.
    if (!status) return;

    if (status.state === "running" && status.proxyPort) {
      if (running) return;
      running = true;
      settle("running");
      listeners.forEach((listener) => listener(status));
      return;
    }
    running = false;
    if (FAILED_STATES.has(status.state) || (status.state === "stopped" && moved)) settle("failed");
    if (status.state !== "stopped") moved = true;
  };

  let seen: MeshStatusPayload | undefined;
  const check = () => {
    const payload = store.getSnapshot().payload;
    if (!payload || payload === seen) return;
    seen = payload;
    handle(payload);
  };
  const unsubscribe = store.subscribe(check);
  // What the window already knows counts at once; subscribing bound the store
  // (events first, then a status) if nobody else had.
  check();
  let timer: ReturnType<typeof setTimeout> | undefined;
  void clockStarts.then(() => {
    if (!settled) timer = setTimeout(() => settle("timeout"), timeoutMs);
  });
  void ready.then(() => clearTimeout(timer));

  return {
    meshId: mesh.id,
    ready,
    isRunning: () => running,
    outcome: () => settled,
    onRunning: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose: () => {
      unsubscribe();
      clearTimeout(timer);
      listeners.clear();
      settle("none");
    },
  };
};

const norm = (host: string): string => host.trim().toLowerCase().replace(/\.$/, "");

/**
 * Does this host go through the profile's mesh? A pinned host, a name under
 * the mesh's MagicDNS suffix (cached from the last time the node ran, so it is
 * known before the node is up), a subdomain of the mesh's control server, or
 * an address shaped like one on it — a CGNAT / mesh-IPv6 literal or a bare
 * label. Never a `*.ts.net` name: that is Tailscale Inc's own MagicDNS
 * domain, so the host is on the system Tailscale's tailnet, and ionscale names
 * its machines under its control domain instead.
 */
export const isMeshRouted = (rawHost: string, mesh: ProfileMesh | undefined): boolean => {
  if (!mesh?.enabled) return false;
  const host = norm(rawHost);
  if (mesh.hosts.map(norm).includes(host)) return true;
  const suffix = mesh.magicDnsSuffix ? norm(mesh.magicDnsSuffix) : undefined;
  if (suffix && (host === suffix || host.endsWith(`.${suffix}`))) return true;
  // Under the control server's domain: routed with no pinning (main's pac.ts, rule 5).
  const domain = controlDomain(mesh.controlUrl);
  if (domain && host.endsWith(`.${domain}`)) return true;
  const shape = classifyHost(host).class;
  return shape === "mesh-ip" || shape === "mesh-bare";
};
