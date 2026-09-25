import { describe, expect, it } from "vitest";
import type { Ray } from "./gizmoMath";
import { gestureFor, gizmoHandles } from "./handles";
import { applyPoint, det3, linear3, type Vec3 } from "./mat4";

const ids = (constraint: Parameters<typeof gizmoHandles>[0], view: "2D" | "3D") =>
  gizmoHandles(constraint, view).map((handle) => handle.id);

const PIVOT: Vec3 = [10, 20, 0];
const Z: Vec3 = [0, 0, 1];
const ortho = (x: number, y: number): Ray => ({ origin: [x, y, 100], direction: [0, 0, -1] });

describe("gizmoHandles", () => {
  it("offers only what the constraint allows", () => {
    expect(ids("rigid", "3D")).toEqual(["move", "move-x", "move-y", "move-z", "rotate-x", "rotate-y", "rotate-z"]);
    expect(ids("similarity", "3D")).toContain("scale");
    expect(ids("similarity", "3D")).not.toContain("scale-x");
    expect(ids("affine", "3D")).toEqual(expect.arrayContaining(["scale", "scale-x", "scale-y", "scale-z"]));
  });

  it("keeps the flat view in its plane: no z handles, rotation about z only", () => {
    expect(ids("affine", "2D")).toEqual(["move", "move-x", "move-y", "rotate-z", "scale", "scale-x", "scale-y"]);
  });
});

describe("gestureFor", () => {
  const drag = (start: Ray, current: Ray, snap = false) => ({ start, current, pivot: PIVOT, viewNormal: Z, snap });
  const handle = (id: string, view: "2D" | "3D" = "2D") =>
    gizmoHandles("affine", view).find((candidate) => candidate.id === id)!;

  it("routes each handle to its gesture", () => {
    expect(applyPoint(gestureFor(handle("move"), drag(ortho(0, 0), ortho(3, 4)))!, [0, 0, 0])).toEqual([3, 4, 0]);
    expect(applyPoint(gestureFor(handle("move-x"), drag(ortho(0, 0), ortho(3, 4)))!, [0, 0, 0])).toEqual([3, 0, 0]);
    const turned = gestureFor(handle("rotate-z"), drag(ortho(15, 20), ortho(10, 25)))!;
    applyPoint(turned, [15, 20, 0]).forEach((v, i) => expect(v).toBeCloseTo([10, 25, 0][i], 9));
    expect(det3(linear3(gestureFor(handle("scale"), drag(ortho(12, 20), ortho(14, 20)))!))).toBeCloseTo(8, 9);
    expect(gestureFor(handle("scale-y"), drag(ortho(10, 22), ortho(10, 26)))![1][1]).toBeCloseTo(3, 9);
  });

  it("snaps rotation only when asked", () => {
    const free = gestureFor(handle("rotate-z"), drag(ortho(15, 20), ortho(15, 22.2)))!;
    const snapped = gestureFor(handle("rotate-z"), drag(ortho(15, 20), ortho(15, 22.2), true))!;
    expect(Math.atan2(free[1][0], free[0][0])).toBeCloseTo(Math.atan2(2.2, 5), 9);
    expect(Math.atan2(snapped[1][0], snapped[0][0])).toBeCloseTo(Math.PI / 6, 9);
  });

  it("is null, not wild, for a handle viewed end-on", () => {
    expect(gestureFor(handle("move-z", "3D"), drag(ortho(0, 0), ortho(3, 4)))).toBeNull();
    expect(gestureFor(handle("rotate-x", "3D"), drag(ortho(15, 20), ortho(10, 25)))).toBeNull();
  });
});
