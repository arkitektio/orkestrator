import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProfileMesh } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import type { MeshEvent, MeshNodeStatus, MeshStatusPayload } from "../../../../../main/mesh/protocol";
import type { MeshBridge } from "./bridge";
import { isMeshRouted, watchMesh } from "./meshGate";

const MESH: ProfileMesh = { id: "lab", label: "Lab", controlUrl: "https://mesh.lab", hosts: ["data.lab"], enabled: true };

const payload = (status?: Partial<MeshNodeStatus>, sidecar: MeshStatusPayload["sidecar"] = { state: "ready", version: "t" }): MeshStatusPayload => ({
  sidecar,
  meshes: status
    ? [{ config: { id: "lab", label: "Lab", controlUrl: "https://mesh.lab", hosts: [], hasNodeState: true }, status: { id: "lab", state: "starting", ...status } as MeshNodeStatus }]
    : [],
});

/** A bridge whose status and events the test drives. */
const fakeBridge = (initial: MeshStatusPayload) => {
  const listeners = new Set<(event: MeshEvent) => void>();
  const bridge = {
    status: vi.fn(async () => initial),
    onEvent: vi.fn((listener: (event: MeshEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    claim: vi.fn(),
  } as unknown as MeshBridge;
  const emit = (next: MeshStatusPayload) => listeners.forEach((listener) => listener({ type: "status", payload: next }));
  return { bridge, emit, listeners };
};

afterEach(() => vi.useRealTimers());

describe("watchMesh", () => {
  it("has nothing to wait for without a mesh, with a switched-off one, or without a bridge", async () => {
    const { bridge } = fakeBridge(payload());
    expect(await watchMesh(undefined, { bridge }).ready).toBe("none");
    expect(await watchMesh({ ...MESH, enabled: false }, { bridge }).ready).toBe("none");
    expect(await watchMesh(MESH, { bridge: undefined }).ready).toBe("none");
  });

  it("opens at once for a node that is already running", async () => {
    const { bridge } = fakeBridge(payload({ state: "running", proxyPort: 1080 }));
    const gate = watchMesh(MESH, { bridge });
    expect(await gate.ready).toBe("running");
    expect(gate.isRunning()).toBe(true);
  });

  it("waits through 'not claimed yet' and 'starting', and opens when the node runs", async () => {
    const { bridge, emit } = fakeBridge(payload());
    const gate = watchMesh(MESH, { bridge });
    emit(payload({ state: "starting" }));
    // Running without a proxy is not routable yet.
    emit(payload({ state: "running" }));
    expect(gate.isRunning()).toBe(false);
    emit(payload({ state: "running", proxyPort: 1080 }));
    expect(await gate.ready).toBe("running");
  });

  it("fails on a node that needs a sign-in, or a sidecar that cannot run", async () => {
    const one = fakeBridge(payload());
    const gate = watchMesh(MESH, { bridge: one.bridge });
    one.emit(payload({ state: "needs-login" }));
    expect(await gate.ready).toBe("failed");

    const two = fakeBridge(payload(undefined, { state: "unavailable", reason: "binary-missing" }));
    expect(await watchMesh(MESH, { bridge: two.bridge }).ready).toBe("failed");
  });

  it("gives up after its timeout", async () => {
    vi.useFakeTimers();
    const { bridge } = fakeBridge(payload({ state: "starting" }));
    const gate = watchMesh(MESH, { bridge, timeoutMs: 1000 });
    vi.advanceTimersByTime(1000);
    expect(await gate.ready).toBe("timeout");
  });

  it("tells its listeners every time the node comes (back) up", async () => {
    const { bridge, emit } = fakeBridge(payload({ state: "starting" }));
    const gate = watchMesh(MESH, { bridge });
    const seen = vi.fn();
    gate.onRunning(seen);

    emit(payload({ state: "running", proxyPort: 1080, magicDnsSuffix: "lab.mesh.arkitekt.live" }));
    emit(payload({ state: "running", proxyPort: 1080 }));
    emit(payload({ state: "starting" }));
    emit(payload({ state: "running", proxyPort: 1081 }));

    expect(seen).toHaveBeenCalledTimes(2);
    expect(seen.mock.calls[0][0].magicDnsSuffix).toBe("lab.mesh.arkitekt.live");
  });

  it("stops listening once disposed", async () => {
    const { bridge, listeners } = fakeBridge(payload({ state: "starting" }));
    const gate = watchMesh(MESH, { bridge });
    gate.dispose();
    expect(listeners.size).toBe(0);
    expect(await gate.ready).toBe("none");
  });
});

describe("isMeshRouted", () => {
  it("knows pinned hosts, the cached suffix and mesh-shaped addresses", () => {
    const mesh = { ...MESH, magicDnsSuffix: "lab.mesh.arkitekt.live" };
    expect(isMeshRouted("data.lab", mesh)).toBe(true);
    expect(isMeshRouted("mikro.lab.mesh.arkitekt.live", mesh)).toBe(true);
    expect(isMeshRouted("100.64.0.7", mesh)).toBe(true);
    expect(isMeshRouted("mikro.tailnet-cafe.ts.net", mesh)).toBe(true);
    expect(isMeshRouted("go.arkitekt.live", mesh)).toBe(false);
  });

  it("counts every subdomain of the control server, but not the control server itself", () => {
    const mesh = { ...MESH, controlUrl: "https://mesh.arkitekt.live" };
    expect(isMeshRouted("mikro.lab.mesh.arkitekt.live", mesh)).toBe(true);
    expect(isMeshRouted("mesh.arkitekt.live", mesh)).toBe(false);
  });

  it("routes nothing without an enabled mesh", () => {
    expect(isMeshRouted("100.64.0.7", undefined)).toBe(false);
    expect(isMeshRouted("100.64.0.7", { ...MESH, enabled: false })).toBe(false);
  });
});
