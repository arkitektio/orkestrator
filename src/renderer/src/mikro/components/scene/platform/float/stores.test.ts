import { describe, expect, it } from "vitest";

import { createSceneFloatStore } from "./floatStore";
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

describe("float target", () => {
  it("closes only the target it is told to, when given one", () => {
    const store = createSceneFloatStore();
    store.getState().open({ kind: "mesh", layerId: "m", ordinal: 3 });
    store.getState().close({ kind: "mesh", layerId: "m", ordinal: 4 });
    expect(store.getState().target).not.toBeNull();
    store.getState().close({ kind: "mesh", layerId: "m", ordinal: 3 });
    expect(store.getState().target).toBeNull();
  });
});
