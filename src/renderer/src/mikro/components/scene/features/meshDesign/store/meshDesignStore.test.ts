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

describe("meshDesignStore reconstruction candidate", () => {
  const candidate = (id: number) =>
    ({ id, gestureKind: "stroke", reconstructorId: "tube-fit", note: null }) as never;

  it("holds one candidate at a time and showing one clears the busy flag and the message", () => {
    const store = createMeshDesignStore();
    store.getState().setStatus("editing", "an old failure");
    store.getState().setCandidateBusy(true);
    store.getState().setCandidate(candidate(1));
    expect(store.getState().candidate?.id).toBe(1);
    expect(store.getState().candidateBusy).toBe(false);
    expect(store.getState().message).toBeNull();
    store.getState().setCandidate(candidate(2));
    expect(store.getState().candidate?.id).toBe(2);
  });

  it("a candidate is not part of the session: discarding leaves meshes and undo alone", () => {
    const store = createMeshDesignStore();
    store.getState().addMesh({ geometry: geometry(), source });
    const { meshes, history } = store.getState();
    store.getState().setCandidate(candidate(1));
    store.getState().setCandidate(null);
    expect(store.getState().meshes).toBe(meshes);
    expect(store.getState().history).toBe(history);
  });

  it("remembers the reconstructor per gesture and merges params", () => {
    const store = createMeshDesignStore();
    store.getState().setReconstructor("stroke", "tube-surface");
    expect(store.getState().reconstructors).toEqual({ stroke: "tube-surface", click: "ball-fit" });
    store.getState().setReconstructParams({ tubeEdge: 0.3 });
    expect(store.getState().reconstructParams.tubeEdge).toBe(0.3);
    expect(store.getState().reconstructParams.ballShape).toBe("ellipsoid");
  });

  it("reset drops the candidate with the session", () => {
    const store = createMeshDesignStore();
    store.getState().setCandidate(candidate(1));
    store.getState().reset();
    expect(store.getState().candidate).toBeNull();
  });
});
