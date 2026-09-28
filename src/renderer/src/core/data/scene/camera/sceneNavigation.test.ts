import { describe, expect, it } from "vitest";
import {
  PAN_VIEWPORT_FRACTION,
  navigationActionForKey,
  panDistance,
  stepSceneZ,
  worldUnitsPerPixelAt,
} from "./sceneNavigation";

describe("navigationActionForKey", () => {
  it.each(["2D", "3D"] as const)("pans along the screen basis with a bare arrow (%s)", (mode) => {
    expect(navigationActionForKey("ArrowLeft", false, mode)).toEqual({ kind: "pan", dx: -1, dy: 0 });
    expect(navigationActionForKey("ArrowRight", false, mode)).toEqual({ kind: "pan", dx: 1, dy: 0 });
    expect(navigationActionForKey("ArrowUp", false, mode)).toEqual({ kind: "pan", dx: 0, dy: 1 });
    expect(navigationActionForKey("ArrowDown", false, mode)).toEqual({ kind: "pan", dx: 0, dy: -1 });
  });

  it("turns the camera on the shifted horizontals in 3D", () => {
    expect(navigationActionForKey("ArrowLeft", true, "3D")).toEqual({
      kind: "orbit",
      direction: -1,
    });
    expect(navigationActionForKey("ArrowRight", true, "3D")).toEqual({
      kind: "orbit",
      direction: 1,
    });
  });

  it("walks the Z stack on the same keys in 2D, where turning is disabled", () => {
    expect(navigationActionForKey("ArrowLeft", true, "2D")).toEqual({ kind: "z", direction: -1 });
    expect(navigationActionForKey("ArrowRight", true, "2D")).toEqual({ kind: "z", direction: 1 });
  });

  it.each(["2D", "3D"] as const)("zooms on shift+up/down in %s", (mode) => {
    expect(navigationActionForKey("ArrowUp", true, mode)).toEqual({ kind: "zoom", direction: 1 });
    expect(navigationActionForKey("ArrowDown", true, mode)).toEqual({ kind: "zoom", direction: -1 });
  });

  it.each(["2D", "3D"] as const)("frames the scene on F in %s, but not Shift+F", (mode) => {
    expect(navigationActionForKey("KeyF", false, mode)).toEqual({ kind: "frame" });
    expect(navigationActionForKey("KeyF", true, mode)).toBeNull();
  });

  it("leaves every other key alone", () => {
    // The digit row belongs to the layer-visibility binding, and the numpad
    // arrows report their own codes — neither is claimed here.
    expect(navigationActionForKey("Digit1", true, "3D")).toBeNull();
    expect(navigationActionForKey("Numpad4", false, "2D")).toBeNull();
    expect(navigationActionForKey("KeyD", false, "3D")).toBeNull();
    expect(navigationActionForKey("", true, "2D")).toBeNull();
  });

  it("never returns an action its mode cannot perform", () => {
    // The point of the split: no key is dead, and neither is bound to something
    // the current view has switched off.
    for (const code of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
      expect(navigationActionForKey(code, true, "2D")?.kind).not.toBe("orbit");
      expect(navigationActionForKey(code, true, "3D")?.kind).not.toBe("z");
    }
  });
});

describe("worldUnitsPerPixelAt", () => {
  it("reads magnification straight off an orthographic camera", () => {
    expect(worldUnitsPerPixelAt({ isOrthographicCamera: true, zoom: 4 }, 999, 800)).toBe(0.25);
  });

  it("ignores distance for an orthographic camera", () => {
    const near = worldUnitsPerPixelAt({ isOrthographicCamera: true, zoom: 2 }, 1, 800);
    const far = worldUnitsPerPixelAt({ isOrthographicCamera: true, zoom: 2 }, 10_000, 800);
    expect(near).toBe(far);
  });

  it("scales with distance for a perspective camera", () => {
    const near = worldUnitsPerPixelAt({ fov: 45 }, 100, 800);
    const far = worldUnitsPerPixelAt({ fov: 45 }, 200, 800);
    expect(far).toBeCloseTo(near * 2, 10);
  });

  it("survives a zero-height viewport and a zero zoom", () => {
    expect(Number.isFinite(worldUnitsPerPixelAt({ fov: 45 }, 100, 0))).toBe(true);
    expect(Number.isFinite(worldUnitsPerPixelAt({ isOrthographicCamera: true, zoom: 0 }, 1, 800))).toBe(
      true,
    );
  });
});

describe("panDistance", () => {
  it("moves a fixed fraction of the viewport, whatever the zoom", () => {
    // At zoom 4 the viewport spans 800/4 = 200 world units, so 8% is 16.
    expect(panDistance({ isOrthographicCamera: true, zoom: 4 }, 0, 800)).toBeCloseTo(
      200 * PAN_VIEWPORT_FRACTION,
      10,
    );
  });
});

describe("stepSceneZ", () => {
  const extent = { min: 0, max: 10, step: 1 }; // 11 slices

  it("walks one slice at a time in both directions", () => {
    expect(stepSceneZ(extent, 4, 1)).toBe(5);
    expect(stepSceneZ(extent, 4, -1)).toBe(3);
  });

  it("clamps at both ends instead of running off the stack", () => {
    expect(stepSceneZ(extent, 10, 1)).toBe(10);
    expect(stepSceneZ(extent, 0, -1)).toBe(0);
  });

  it("snaps a drifted position back onto the grid", () => {
    // The whole reason this rounds rather than adding: 4.4 is not a slice, and
    // stepping from it must land on one rather than carry the error forward.
    expect(stepSceneZ(extent, 4.4, 1)).toBe(5);
    expect(stepSceneZ(extent, 4.6, -1)).toBe(4);
  });

  it("does not accumulate drift over a long walk", () => {
    let z = 0;
    for (let i = 0; i < 10; i++) z = stepSceneZ(extent, z, 1);
    expect(z).toBe(10);
  });

  it("handles an offset, non-integer grid", () => {
    const offset = { min: -2.5, max: 2.5, step: 0.5 }; // 11 slices
    expect(stepSceneZ(offset, -2.5, 1)).toBeCloseTo(-2, 10);
    expect(stepSceneZ(offset, 2.5, 1)).toBeCloseTo(2.5, 10);
  });

  it("stays put when the extent has no thickness to step through", () => {
    expect(stepSceneZ({ min: 3, max: 3, step: 0 }, 3, 1)).toBe(3);
    expect(stepSceneZ({ min: 0, max: 0, step: 1 }, 0, 1)).toBe(0);
  });
});
