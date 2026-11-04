import { describe, expect, it, vi } from "vitest";

import { annotationFloatOwner, createSceneFloatStore, meshFloatOwner } from "./floatStore";
import { createStagedLayersStore, isStagedLayerId, stagedKeyOf, type StagedLayer } from "./stagedLayerStore";

const entry = (key: string, owner: string, extra: Partial<StagedLayer> = {}): StagedLayer =>
  ({ key, owner, label: key, input: {}, layer: { id: key }, engine: { id: key }, ...extra }) as unknown as StagedLayer;

describe("stagedKeyOf", () => {
  it("is one key per input, whatever the order its fields were spelled in", () => {
    const a = stagedKeyOf({ intensity: { scene: "1", lens: "2", colormap: "MAGMA" } } as never);
    const b = stagedKeyOf({ intensity: { colormap: "MAGMA", lens: "2", scene: "1" } } as never);
    expect(a).toBe(b);
    expect(isStagedLayerId(a)).toBe(true);
  });

  it("differs for a different layer", () => {
    expect(stagedKeyOf({ intensity: { scene: "1", lens: "2" } } as never)).not.toBe(
      stagedKeyOf({ intensity: { scene: "1", lens: "3" } } as never),
    );
  });

  it("is never a server id", () => {
    expect(isStagedLayerId("42")).toBe(false);
    expect(isStagedLayerId(null)).toBe(false);
  });
});

describe("staged layers", () => {
  it("staging the same key twice replaces the entry, in place", () => {
    const store = createStagedLayersStore();
    store.getState().stage(entry("staged:a", "o1"));
    store.getState().stage(entry("staged:b", "o1"));
    store.getState().stage(entry("staged:a", "o1", { label: "again" }));
    expect(store.getState().entries.map((e) => [e.key, e.label])).toEqual([
      ["staged:a", "again"],
      ["staged:b", "staged:b"],
    ]);
  });

  it("discards one owner's layers and keeps the others'", () => {
    const store = createStagedLayersStore();
    store.getState().stage(entry("staged:a", "o1"));
    store.getState().stage(entry("staged:b", "o2"));
    store.getState().discardOwner("o1");
    expect(store.getState().entries.map((e) => e.key)).toEqual(["staged:b"]);
  });

  it("writes nothing when there is nothing to discard", () => {
    const store = createStagedLayersStore();
    store.getState().stage(entry("staged:a", "o1"));
    const before = store.getState().entries;
    store.getState().discard(["staged:zz"]);
    store.getState().discardOwner("nobody");
    expect(store.getState().entries).toBe(before);
  });
});

describe("float hold", () => {
  it("runs a click at once while nothing holds", () => {
    const store = createSceneFloatStore();
    const run = vi.fn();
    store.getState().guard(annotationFloatOwner("1"), run);
    expect(run).toHaveBeenCalledOnce();
  });

  it("defers a click on another object while a float holds staged layers, until it is taken", () => {
    const store = createSceneFloatStore();
    store.getState().setHold(annotationFloatOwner("1"));
    const run = vi.fn();
    store.getState().guard(meshFloatOwner({ layerId: "m", ordinal: 3 }), run);
    expect(run).not.toHaveBeenCalled();

    const pending = store.getState().takePending();
    expect(store.getState().pendingSwitch).toBeNull();
    pending?.();
    expect(run).toHaveBeenCalledOnce();
  });

  it("lets a click on the holding object through, unless it closes it", () => {
    const store = createSceneFloatStore();
    const owner = meshFloatOwner({ layerId: "m", ordinal: 3 });
    store.getState().setHold(owner);
    const select = vi.fn();
    store.getState().guard(owner, select);
    expect(select).toHaveBeenCalledOnce();

    const deselect = vi.fn();
    store.getState().guard(owner, deselect, { closesHolder: true });
    expect(deselect).not.toHaveBeenCalled();
    expect(store.getState().pendingSwitch).toBe(deselect);
  });

  it("releases the hold only for its owner, and drops what was deferred with it", () => {
    const store = createSceneFloatStore();
    store.getState().setHold("a");
    store.getState().guard("b", () => {});
    store.getState().releaseHold("b");
    expect(store.getState().hold).toBe("a");
    store.getState().releaseHold("a");
    expect(store.getState().hold).toBeNull();
    expect(store.getState().pendingSwitch).toBeNull();
  });
});
