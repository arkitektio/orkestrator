import { describe, expect, it } from "vitest";
import { applyPoint, approxEqual, identity, isIdentity, rotationAxisAngle, scaling, translation, type Vec3 } from "../math/mat4";
import { completePairs, createRegistrationStore, drawnPivot, isDirty, movingWorldPosition } from "./registrationStore";

const session = { edgeId: "e1", edgeVersion: 1, inverted: false, movingLayerId: "m", memberLayerIds: ["m"] };

const started = () => {
  const store = createRegistrationStore();
  store.getState().begin(session, { pivot: [10, 10, 0], fixedLayerId: "f" });
  return store;
};

describe("draft", () => {
  it("starts clean and refuses edits without a session", () => {
    const store = createRegistrationStore();
    store.getState().applyStep(translation([1, 0, 0]));
    expect(isDirty(store.getState())).toBe(false);
  });

  it("left-multiplies discrete steps and undoes them one by one", () => {
    const store = started();
    store.getState().applyStep(translation([5, 0, 0]));
    store.getState().applyStep(scaling([2, 2, 2]));
    // Scale AFTER translate: the translation is scaled too.
    expect(applyPoint(store.getState().delta, [0, 0, 0])).toEqual([10, 0, 0]);
    store.getState().undo();
    expect(applyPoint(store.getState().delta, [0, 0, 0])).toEqual([5, 0, 0]);
    store.getState().undo();
    expect(isIdentity(store.getState().delta)).toBe(true);
    store.getState().redo();
    store.getState().redo();
    expect(applyPoint(store.getState().delta, [0, 0, 0])).toEqual([10, 0, 0]);
  });

  it("a new edit clears the redo stack", () => {
    const store = started();
    store.getState().applyStep(translation([5, 0, 0]));
    store.getState().undo();
    store.getState().applyStep(translation([0, 3, 0]));
    store.getState().redo();
    expect(applyPoint(store.getState().delta, [0, 0, 0])).toEqual([0, 3, 0]);
  });

  it("measures a drag from its START and records ONE undo step for it", () => {
    const store = started();
    store.getState().applyStep(translation([1, 0, 0]));
    store.getState().beginGesture();
    for (const x of [2, 5, 9]) store.getState().updateGesture(translation([x, 0, 0]));
    expect(applyPoint(store.getState().delta, [0, 0, 0])).toEqual([10, 0, 0]); // 1 + 9, not 1+2+5+9
    store.getState().endGesture();
    expect(store.getState().undoStack).toHaveLength(2);
    store.getState().undo();
    expect(applyPoint(store.getState().delta, [0, 0, 0])).toEqual([1, 0, 0]);
  });

  it("a click that moved nothing leaves no undo step; a cancelled drag leaves no trace", () => {
    const store = started();
    store.getState().beginGesture();
    store.getState().endGesture();
    expect(store.getState().undoStack).toHaveLength(0);

    store.getState().beginGesture();
    store.getState().updateGesture(translation([4, 4, 4]));
    store.getState().cancelGesture();
    expect(isIdentity(store.getState().delta)).toBe(true);
    expect(store.getState().undoStack).toHaveLength(0);
  });

  it("tightening the constraint straightens the draft in place, undoably", () => {
    const store = started();
    store.getState().setConstraint("affine");
    store.getState().replaceDelta(scaling([3, 1, 1]));
    const pivotBefore = applyPoint(store.getState().delta, store.getState().pivot);
    store.getState().setConstraint("rigid");
    const pivotAfter = applyPoint(store.getState().delta, store.getState().pivot);
    pivotAfter.forEach((v, i) => expect(v).toBeCloseTo(pivotBefore[i], 9));
    expect(store.getState().delta[0][0]).toBeCloseTo(1, 9);
    store.getState().undo();
    expect(store.getState().delta[0][0]).toBe(3);
    // Loosening is not an edit.
    const steps = store.getState().undoStack.length;
    store.getState().setConstraint("affine");
    expect(store.getState().undoStack).toHaveLength(steps);
  });

  it("reset is one undoable step, and a no-op on a clean draft", () => {
    const store = started();
    store.getState().reset();
    expect(store.getState().undoStack).toHaveLength(0);
    store.getState().applyStep(translation([1, 2, 3]));
    store.getState().reset();
    expect(isIdentity(store.getState().delta)).toBe(true);
    store.getState().undo();
    expect(isDirty(store.getState())).toBe(true);
  });
});

describe("pivot", () => {
  it("is attached to the data: it is drawn wherever the draft has carried it", () => {
    const store = started();
    store.getState().applyStep(translation([100, 0, 0]));
    expect(drawnPivot(store.getState())).toEqual([110, 10, 0]);
    expect(store.getState().pivot).toEqual([10, 10, 0]);
  });

  it("takes a picked (drawn) point back into base world", () => {
    const store = started();
    store.getState().applyStep(translation([100, 0, 0]));
    store.getState().setDrawnPivot([150, 20, 0]);
    expect(store.getState().pivot).toEqual([50, 20, 0]);
    expect(drawnPivot(store.getState())).toEqual([150, 20, 0]);
  });

  it("stays on screen where it was across a rebase", () => {
    const store = started();
    store.getState().applyStep(translation([100, 0, 0]));
    const before = drawnPivot(store.getState());
    store.getState().rebase({ edgeId: "e1", edgeVersion: 2, inverted: false, memberLayerIds: ["m"] });
    expect(drawnPivot(store.getState())).toEqual(before);
  });
});

describe("landmarks", () => {
  it("fills the open pair and alternates sides", () => {
    const store = started();
    store.getState().addLandmarkPoint("fixed", [1, 1, 0]);
    expect(store.getState().pickSide).toBe("moving");
    store.getState().addLandmarkPoint("moving", [2, 2, 0]);
    expect(store.getState().pickSide).toBe("fixed");
    expect(store.getState().landmarks).toHaveLength(1);
    expect(completePairs(store.getState().landmarks)).toEqual([{ fixed: [1, 1, 0], moving: [2, 2, 0] }]);
  });

  it("two clicks on the same side make two pairs, not one overwritten", () => {
    const store = started();
    store.getState().addLandmarkPoint("fixed", [1, 1, 0]);
    store.getState().addLandmarkPoint("fixed", [5, 5, 0]);
    expect(store.getState().landmarks).toHaveLength(2);
    expect(completePairs(store.getState().landmarks)).toEqual([]);
  });

  it("stores a moving click in BASE world, so it follows the data under any draft", () => {
    const store = started();
    store.getState().applyStep(translation([100, 0, 0]));
    store.getState().addLandmarkPoint("moving", [107, 3, 0]); // clicked where it is DRAWN
    const [landmark] = store.getState().landmarks;
    expect(landmark.moving).toEqual([7, 3, 0]);

    store.getState().applyStep(rotationAxisAngle([0, 0, 1], Math.PI / 2));
    const drawn = movingWorldPosition(store.getState().landmarks[0], store.getState().delta)!;
    // Still on the same data point: D · base.
    const expected = applyPoint(store.getState().delta, [7, 3, 0]);
    drawn.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 9));
  });

  it("removes and clears", () => {
    const store = started();
    store.getState().addLandmarkPoint("fixed", [1, 1, 0]);
    store.getState().addLandmarkPoint("fixed", [2, 2, 0]);
    store.getState().removeLandmark(store.getState().landmarks[0].id);
    expect(store.getState().landmarks.map((l) => l.fixed)).toEqual([[2, 2, 0]]);
    store.getState().clearLandmarks();
    expect(store.getState().landmarks).toEqual([]);
  });
});

describe("save round trip", () => {
  it("freezes the draft while saving and restores it if the save fails", () => {
    const store = started();
    store.getState().applyStep(translation([5, 0, 0]));
    store.getState().markSaving();
    store.getState().applyStep(translation([99, 0, 0]));
    store.getState().undo();
    expect(applyPoint(store.getState().delta, [0, 0, 0])).toEqual([5, 0, 0]);
    store.getState().markEditing();
    store.getState().applyStep(translation([1, 0, 0]));
    expect(applyPoint(store.getState().delta, [0, 0, 0])).toEqual([6, 0, 0]);
  });

  it("rebase folds the draft into the edge: delta zeroes, landmarks stay on the data", () => {
    const store = started();
    const draft = translation([100, 0, 0]);
    store.getState().applyStep(draft);
    store.getState().addLandmarkPoint("fixed", [107, 3, 0]);
    store.getState().addLandmarkPoint("moving", [107, 3, 0]);
    const drawnBefore = movingWorldPosition(store.getState().landmarks[0], store.getState().delta) as Vec3;

    store.getState().markSaving();
    store.getState().rebase({ edgeId: "e2", edgeVersion: 1, inverted: false, memberLayerIds: ["m", "n"] });

    const state = store.getState();
    expect(state.session).toMatchObject({ edgeId: "e2", phase: "editing", memberLayerIds: ["m", "n"] });
    expect(approxEqual(state.delta, identity())).toBe(true);
    expect(state.undoStack).toEqual([]);
    // The point is drawn exactly where it was: the placement absorbed the draft.
    expect(movingWorldPosition(state.landmarks[0], state.delta)).toEqual(drawnBefore);
    expect(state.landmarks[0].fixed).toEqual([107, 3, 0]);
  });

  it("end clears the session and the draft", () => {
    const store = started();
    store.getState().applyStep(translation([5, 0, 0]));
    store.getState().end();
    expect(store.getState().session).toBeNull();
    expect(isDirty(store.getState())).toBe(false);
  });
});
