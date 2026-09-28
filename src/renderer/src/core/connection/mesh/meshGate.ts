import type { ProfileMesh } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { classifyHost, isMeshClass } from "@/core/connection/arkitekt/doctor/classify";
import { controlDomain, type MeshNodeStatus, type MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { meshBridge, type MeshBridge } from "./bridge";

/**
 * When may a service behind the mesh be checked?
 *
 * The node is claimed at mount (`MeshSync`) or with the grant's key
 * (`connect`), and takes seconds to join; the aliases behind it used to be
 * probed in that window, time out, and be marked invalid — with nothing ever
 * checking again once the mesh came up. A gate watches the active profile's
 * node and says when it is `running` with a proxy (main applies the routing
 * BEFORE it broadcasts that, so traffic is routed by then), when it has
 * definitively failed, or that it gave up waiting. It never claims anything
 * itself: there is exactly one claimer per window.
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
  onRunning: (listener: (status: MeshNodeStatus) => void) => () => void;
  dispose: () => void;
};

export const MESH_GATE_TIMEOUT_MS = 15_000;

/** No mesh, a switched-off one, or a build without the sidecar: nothing to wait for. */
export const NO_MESH_GATE: MeshGate = {
  meshId: null,
  ready: Promise.resolve("none"),
  isRunning: () => false,
  onRunning: () => () => {},
  dispose: () => {},
};

/** States the node will not leave by itself soon. */
const FAILED_STATES = new Set<MeshNodeStatus["state"]>(["needs-login", "needs-machine-auth", "error"]);

export const watchMesh = (
  mesh: ProfileMesh | undefined,
  {
    bridge = meshBridge(),
    timeoutMs = MESH_GATE_TIMEOUT_MS,
  }: { bridge?: MeshBridge; timeoutMs?: number } = {},
): MeshGate => {
  if (!mesh?.enabled || !bridge) return NO_MESH_GATE;

  let running = false;
  let settled = false;
  let settle: (outcome: GateOutcome) => void = () => {};
  const ready = new Promise<GateOutcome>((resolve) => {
    settle = (outcome) => {
      if (settled) return;
      settled = true;
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
    if (FAILED_STATES.has(status.state)) settle("failed");
  };

  const unsubscribe = bridge.onEvent((event) => {
    if (event.type === "status") handle(event.payload);
  });
  // Subscribed first, then asked: a transition between the two is not lost.
  bridge.status().then(handle, () => {});
  const timer = setTimeout(() => settle("timeout"), timeoutMs);
  void ready.then(() => clearTimeout(timer));

  return {
    meshId: mesh.id,
    ready,
    isRunning: () => running,
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
 * anything shaped like a mesh address — a CGNAT / mesh-IPv6 literal or a
 * MagicDNS name.
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
  return isMeshClass(classifyHost(host));
};
