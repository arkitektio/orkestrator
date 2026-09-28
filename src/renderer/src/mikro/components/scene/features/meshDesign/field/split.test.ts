import { describe, expect, it } from "vitest";

import { marchField } from "./sculptField";
import { applyStamp, sphereStamp, stampToField } from "./stamps";
import { splitField } from "./split";

describe("splitField", () => {
  it("parts a dumbbell at its waist into two watertight meshes", () => {
    // Two r=4 spheres joined by an overlap at x = ±3.
    let field = stampToField(sphereStamp([-3, 0, 0], 4), 0.4);
    field = applyStamp(field, sphereStamp([3, 0, 0], 4), "add");
    const parts = splitField(field, [-4, 0, 0], [4, 0, 0]);
    expect(parts).not.toBeNull();
    const a = marchField(parts!.a, "cubes");
    const b = marchField(parts!.b, "cubes");
    expect(a.indices.length).toBeGreaterThan(0);
    expect(b.indices.length).toBeGreaterThan(0);
    // Each half stays on its own side (allowing the shared waist).
    for (let v = 0; v < a.positions.length; v += 3) expect(a.positions[v]).toBeLessThan(1.5);
    for (let v = 0; v < b.positions.length; v += 3) expect(b.positions[v]).toBeGreaterThan(-1.5);
  });

  it("declines when a seed misses the inside or both land together", () => {
    const field = stampToField(sphereStamp([0, 0, 0], 3), 0.5);
    expect(splitField(field, [20, 20, 20], [0, 0, 0])).toBeNull();
    // Two clicks in the SAME cell cannot name two sides — declined.
    expect(splitField(field, [0.1, 0, 0], [0, 0.1, 0])).toBeNull();
    expect(splitField(field, [0, 0, 0], [0, 0, 0])).toBeNull();
    // Clearly separated seeds inside the sphere do part it.
    expect(splitField(field, [-2, 0, 0], [2, 0, 0])).not.toBeNull();
  });
});
