import { describe, expect, it } from "vitest";
import { reconcileSession, type SessionLayer } from "./sessionReconcile";
import type { RegistrationSession } from "./registrationStore";

const WORLD = { id: "w" };
const edge = (id: string, version: number) => ({
  __typename: "AffineTransformation",
  id,
  version,
  validity: "MANUAL",
  input: { id: "grid" },
  output: WORLD,
  inputAxes: ["y", "x"],
  outputAxes: ["y", "x"],
  affine: [
    [1, 0, 0],
    [0, 1, 0],
  ],
});

const layer = (id: string, edgeId: string, version: number): SessionLayer => ({
  id,
  placeable: true,
  pathToWorld: [{ inverted: false, transformation: edge(edgeId, version) }],
  finalStep: { edgeId, version, inverted: false },
});

const session: RegistrationSession = {
  edgeId: "e1",
  edgeVersion: 1,
  inverted: false,
  movingLayerId: "m",
  memberLayerIds: ["m"],
  phase: "editing",
};

const run = (layers: SessionLayer[], overrides: Partial<Parameters<typeof reconcileSession>[0]> = {}) =>
  reconcileSession({ session, pendingLayerId: null, layers, worldId: "w", ...overrides });

describe("reconcileSession", () => {
  it("does nothing while the edge state is the session's", () => {
    expect(run([layer("m", "e1", 1)])).toEqual({ type: "none" });
  });

  it("rebases on a version bump — an in-place update landed", () => {
    expect(run([layer("m", "e1", 2)])).toEqual({
      type: "rebase",
      edgeId: "e1",
      edgeVersion: 2,
      inverted: false,
      memberLayerIds: ["m"],
    });
  });

  it("rebases onto a NEW edge — a replace landed — and recomputes who moves with it", () => {
    expect(run([layer("m", "e2", 1), layer("n", "e2", 1), layer("o", "e1", 1)])).toEqual({
      type: "rebase",
      edgeId: "e2",
      edgeVersion: 1,
      inverted: false,
      memberLayerIds: ["m", "n"],
    });
  });

  it("rebases the same way while SAVING: the phase does not gate it", () => {
    const action = run([layer("m", "e1", 2)], { session: { ...session, phase: "saving" } });
    expect(action.type).toBe("rebase");
  });

  it("tracks membership changes on an unchanged edge", () => {
    expect(run([layer("m", "e1", 1), layer("n", "e1", 1)])).toEqual({ type: "members", memberLayerIds: ["m", "n"] });
  });

  it("ends when the moving layer disappears or loses its placement", () => {
    expect(run([layer("other", "e1", 1)]).type).toBe("end");
    expect(run([{ ...layer("m", "e1", 1), placeable: false }]).type).toBe("end");
    expect(run([{ id: "m", placeable: false, pathToWorld: null, finalStep: null }]).type).toBe("end");
  });

  it("starts a pending session only once the seeded layer is adjustable", () => {
    const unplaced: SessionLayer = { id: "p", placeable: false, pathToWorld: null, finalStep: null };
    expect(run([unplaced], { session: null, pendingLayerId: "p" })).toEqual({ type: "none" });
    expect(run([layer("p", "e9", 1)], { session: null, pendingLayerId: "p" })).toEqual({ type: "begin", layerId: "p" });
    expect(run([layer("p", "e9", 1)], { session: null, pendingLayerId: null })).toEqual({ type: "none" });
  });
});
