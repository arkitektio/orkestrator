// @vitest-environment jsdom
// (the generated `graphql.ts` enums are runtime values, and importing that
// module pulls in the Apollo hooks barrel, which touches `window` on load)
import { describe, expect, it } from "vitest";

import { createRoiDrawingStore } from "./roiDrawingStore";

// The volumetric anchor: a probe click seeds it, RoiDrawer consumes+clears it and raises `primitiveSessionActive` while sizing — the
// flag is what stops the commit click (which may also hit the volume mesh)
// from re-anchoring.
describe("pendingPrimitiveAnchor / primitiveSessionActive", () => {
  it("round-trips the anchor and the session flag", () => {
    const store = createRoiDrawingStore();
    expect(store.getState().pendingPrimitiveAnchor).toBeNull();
    expect(store.getState().primitiveSessionActive).toBe(false);

    store.getState().setPendingPrimitiveAnchor([4, 5, 6]);
    expect(store.getState().pendingPrimitiveAnchor).toEqual([4, 5, 6]);

    store.getState().setPrimitiveSessionActive(true);
    store.getState().setPendingPrimitiveAnchor(null);
    expect(store.getState().primitiveSessionActive).toBe(true);
    expect(store.getState().pendingPrimitiveAnchor).toBeNull();

    store.getState().setPrimitiveSessionActive(false);
    expect(store.getState().primitiveSessionActive).toBe(false);
  });
});

/**
 * The preview handover. A drawn shape must be on screen CONTINUOUSLY from the
 * gesture until the persisted annotation is actually being drawn — dropping it
 * when the mutation merely resolves blinks it out, and the gap is widest on a
 * scene's first annotation (the annotation layer has to be minted and mounted
 * before its query can return the shape).
 */
describe("persisted preview handover", () => {
  const roi = (id: string) => ({
    id,
    kind: "RECTANGLE" as never,
    tool: "RECTANGLE" as never,
    worldVectors: [{ x: 0, y: 0, z: 0 }],
  });

  it("keeps a confirmed preview until its annotation is in hand", () => {
    const store = createRoiDrawingStore();
    store.getState().addDrawnRoi(roi("local:1"));
    store
      .getState()
      .markDrawnRoiPersisted("local:1", { id: "ann:1", collectionId: "col:1" }, 1_000);

    // Server said yes, but the layer has not drawn it yet.
    expect(store.getState().drawnRois).toHaveLength(1);
    store.getState().resolvePersistedRois("col:1", [], 1_100);
    expect(store.getState().drawnRois).toHaveLength(1);

    // The layer's query returned it — now the preview hands over.
    store.getState().resolvePersistedRois("col:1", ["ann:1"], 1_200);
    expect(store.getState().drawnRois).toHaveLength(0);
  });

  it("never drops an unconfirmed preview, so a failed mutation loses nothing", () => {
    const store = createRoiDrawingStore();
    store.getState().addDrawnRoi(roi("local:1"));

    store.getState().resolvePersistedRois("col:1", ["ann:other"], 999_999);
    expect(store.getState().drawnRois).toHaveLength(1);
  });

  it("lets only the owning collection's layer expire a preview", () => {
    // A scene can carry several annotation layers, each polling its own
    // collection. Another layer's poll must not time out a shape it could
    // never have resolved.
    const store = createRoiDrawingStore();
    store.getState().addDrawnRoi(roi("local:1"));
    store
      .getState()
      .markDrawnRoiPersisted("local:1", { id: "ann:1", collectionId: "col:1" }, 0);

    store.getState().resolvePersistedRois("col:2", [], 999_999);
    expect(store.getState().drawnRois).toHaveLength(1);

    store.getState().resolvePersistedRois("col:1", [], 999_999);
    expect(store.getState().drawnRois).toHaveLength(0);
  });

  it("gives up on a confirmed preview whose annotation never arrives", () => {
    const store = createRoiDrawingStore();
    store.getState().addDrawnRoi(roi("local:1"));
    store
      .getState()
      .markDrawnRoiPersisted("local:1", { id: "ann:1", collectionId: "col:1" }, 0);

    store.getState().resolvePersistedRois("col:1", [], 14_000);
    expect(store.getState().drawnRois).toHaveLength(1);

    store.getState().resolvePersistedRois("col:1", [], 16_000);
    expect(store.getState().drawnRois).toHaveLength(0);
  });

  it("does not rewrite the list when nothing resolved (it runs on every poll)", () => {
    const store = createRoiDrawingStore();
    store.getState().addDrawnRoi(roi("local:1"));
    const before = store.getState().drawnRois;

    store.getState().resolvePersistedRois("col:1", ["ann:unrelated"], 1_000);
    expect(store.getState().drawnRois).toBe(before);
  });
});
