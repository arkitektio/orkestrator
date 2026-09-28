import { describe, expect, it } from "vitest";

import { createMeshDesignStore, UNDO_DEPTH } from "./meshDesignStore";

const geometry = (n = 1) => ({
  positions: new Float32Array(9 * n),
  indices: Uint32Array.from({ length: 3 * n }, (_, i) => i % (3 * n)),
});
const source = { kind: "tube", layerId: "layer", level: 0 } as const;

describe("meshDesignStore undo/redo", () => {
  it("undoes and redoes sculpt steps, and a new act clears redo", () => {
    const store = createMeshDesignStore();
    const id = store.getState().addMesh({ geometry: geometry(), source });
    store.getState().applySculpt(id, { field: null as never, original: geometry(2), current: geometry(2), source });
    expect(store.getState().meshes[0].current.indices).toHaveLength(6);

    store.getState().undo();
    expect(store.getState().meshes[0].current.indices).toHaveLength(3);
    store.getState().redo();
    expect(store.getState().meshes[0].current.indices).toHaveLength(6);

    store.getState().undo();
    store.getState().applySculpt(id, { field: null as never, original: geometry(3), current: geometry(3), source });
    expect(store.getState().future).toHaveLength(0); // a new act clears redo
    store.getState().undo();
    store.getState().undo();
    expect(store.getState().meshes).toHaveLength(0); // back before the first add
    store.getState().undo(); // nothing left: no-op
    expect(store.getState().meshes).toHaveLength(0);
  });

  it("caps the history depth", () => {
    const store = createMeshDesignStore();
    const id = store.getState().addMesh({ geometry: geometry(), source });
    for (let i = 0; i < UNDO_DEPTH + 5; i++) {
      store.getState().applySculpt(id, { field: null as never, original: geometry(i + 2), current: geometry(i + 2), source });
    }
    expect(store.getState().history).toHaveLength(UNDO_DEPTH);
  });

  it("removeMesh and setCurrent are undoable too", () => {
    const store = createMeshDesignStore();
    const id = store.getState().addMesh({ geometry: geometry(), source });
    store.getState().removeMesh(id);
    expect(store.getState().meshes).toHaveLength(0);
    store.getState().undo();
    expect(store.getState().meshes).toHaveLength(1);
  });
});
