import { describe, expect, it, vi } from "vitest";
import type { MeshEvent, MeshStatusPayload } from "../../../../../main/mesh/protocol";
import type { MeshBridge } from "./bridge";
import { createMeshStatusStore } from "./meshStatusStore";

const payload = (seq: number, state = "running"): MeshStatusPayload =>
  ({
    seq,
    sidecar: { state: "ready", version: "t" },
    meshes: [{ config: { id: "lab", label: "Lab", controlUrl: "https://m", hosts: [] }, status: { id: "lab", state }, joining: false }],
  }) as MeshStatusPayload;

const fakeBridge = (initial: MeshStatusPayload) => {
  const listeners = new Set<(event: MeshEvent) => void>();
  const bridge = {
    status: vi.fn(async () => initial),
    onEvent: vi.fn((listener: (event: MeshEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
  } as unknown as MeshBridge;
  const emit = (event: MeshEvent) => listeners.forEach((listener) => listener(event));
  return { bridge, emit, listeners };
};

describe("meshStatusStore", () => {
  it("binds once for every reader, events first, then one status", async () => {
    const { bridge, listeners } = fakeBridge(payload(1));
    const store = createMeshStatusStore(bridge);
    const off = [store.subscribe(() => {}), store.subscribe(() => {}), store.subscribePings(() => {})];
    await vi.waitFor(() => expect(store.getSnapshot().payload?.seq).toBe(1));
    expect(bridge.onEvent).toHaveBeenCalledTimes(1);
    expect(bridge.status).toHaveBeenCalledTimes(1);

    off.forEach((unsubscribe) => unsubscribe());
    expect(listeners.size).toBe(0);
  });

  it("keeps the newest payload: an older answer never rolls a newer broadcast back", async () => {
    const { bridge, emit } = fakeBridge(payload(1, "starting"));
    const store = createMeshStatusStore(bridge);
    store.subscribe(() => {});
    emit({ type: "status", payload: payload(5, "running") });
    await Promise.resolve();
    await Promise.resolve();
    expect(store.getSnapshot().payload?.seq).toBe(5);
    store.accept(payload(3, "stopped"));
    expect(store.getSnapshot().payload?.meshes[0].status.state).toBe("running");
  });

  it("keeps pings apart, so a ping does not wake status readers", async () => {
    const { bridge, emit } = fakeBridge(payload(1));
    const store = createMeshStatusStore(bridge);
    const statusReader = vi.fn();
    store.subscribe(statusReader);
    await vi.waitFor(() => expect(store.getSnapshot().payload).toBeDefined());
    statusReader.mockClear();
    emit({ type: "ping", meshId: "lab", result: { target: "100.64.0.5", attempt: 1, final: true, ok: true, direct: true } });
    expect(store.getPings()["lab::100.64.0.5"]).toMatchObject({ direct: true });
    expect(statusReader).not.toHaveBeenCalled();
  });

  it("asks main once when nobody listens, and says it is unavailable without a bridge", async () => {
    const { bridge } = fakeBridge(payload(2));
    expect((await createMeshStatusStore(bridge).load())?.seq).toBe(2);
    const none = createMeshStatusStore(undefined);
    expect(none.available).toBe(false);
    expect(await none.load()).toBeUndefined();
  });
});
