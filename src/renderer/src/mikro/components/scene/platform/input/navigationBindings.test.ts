import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  cameraButtonsFor,
  createPressCounter,
  DOUBLE_PRESS_MS,
  leftPressOwner,
  type LeftPressInput,
} from "./navigationBindings";

describe("camera buttons", () => {
  it("pans with the middle button in every case", () => {
    for (const displayMode of ["2D", "3D"] as const) {
      for (const leftIsHand of [true, false]) {
        expect(cameraButtonsFor({ displayMode, leftIsHand }).MIDDLE).toBe(THREE.MOUSE.PAN);
      }
    }
  });

  it("orbits with the right button in 3D and pans with it in 2D", () => {
    expect(cameraButtonsFor({ displayMode: "3D", leftIsHand: false }).RIGHT).toBe(THREE.MOUSE.ROTATE);
    expect(cameraButtonsFor({ displayMode: "2D", leftIsHand: false }).RIGHT).toBe(THREE.MOUSE.PAN);
  });

  it("gives the left button to the hand, or to nobody so the tool has it", () => {
    for (const displayMode of ["2D", "3D"] as const) {
      expect(cameraButtonsFor({ displayMode, leftIsHand: true }).LEFT).toBe(THREE.MOUSE.PAN);
      expect(cameraButtonsFor({ displayMode, leftIsHand: false }).LEFT).toBeUndefined();
    }
  });

  it("answers the SAME object for the same case, so R3F does not re-apply it", () => {
    expect(cameraButtonsFor({ displayMode: "2D", leftIsHand: true })).toBe(
      cameraButtonsFor({ displayMode: "2D", leftIsHand: true }),
    );
  });
});

describe("left press owner", () => {
  const annotate = (overrides: Partial<LeftPressInput["annotate"]> = {}, detail = 1) =>
    leftPressOwner({
      interactionMode: "ANNOTATE",
      designArmed: false,
      handHeld: false,
      annotate: { armed: true, marquee: false, inProgress: false, ...overrides },
      detail,
    });

  it("moves the view in ANNOTATE until a double-click starts a shape", () => {
    expect(annotate({}, 1)).toBe("camera");
    expect(annotate({}, 2)).toBe("tool");
  });

  it("gives every press to a shape already under way", () => {
    expect(annotate({ inProgress: true }, 1)).toBe("tool");
  });

  it("keeps the marquee's plain drag", () => {
    expect(annotate({ marquee: true }, 1)).toBe("tool");
  });

  it("lets Space take the press from any tool", () => {
    expect(
      leftPressOwner({
        interactionMode: "PROBE",
        designArmed: false,
        handHeld: true,
        annotate: { armed: false, marquee: false, inProgress: false },
        detail: 1,
      }),
    ).toBe("camera");
    expect(
      leftPressOwner({
        interactionMode: "PROBE",
        designArmed: false,
        handHeld: false,
        annotate: { armed: false, marquee: false, inProgress: false },
        detail: 1,
      }),
    ).toBe("tool");
  });
});

describe("press counter", () => {
  it("counts a quick second press in place as the second of a double-click", () => {
    const count = createPressCounter();
    expect(count({ at: 0, x: 10, y: 10 })).toBe(1);
    expect(count({ at: 200, x: 12, y: 11 })).toBe(2);
  });

  it("starts again after a pause or a move", () => {
    const count = createPressCounter();
    count({ at: 0, x: 10, y: 10 });
    expect(count({ at: DOUBLE_PRESS_MS + 1, x: 10, y: 10 })).toBe(1);
    expect(count({ at: DOUBLE_PRESS_MS + 100, x: 60, y: 10 })).toBe(1);
  });
});
