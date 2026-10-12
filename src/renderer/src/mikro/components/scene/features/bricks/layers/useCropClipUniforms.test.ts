import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CLIP_UNBOUNDED } from "../gpu/volumeRayNodes";
import { localCropClip, intersectLocalVolumeBox } from "../probeMath";
import { resolveCropClip } from "./useCropClipUniforms";

const shape = [100, 100, 50] as const;
const box = { min: [10, 20, 5], max: [40, 60, 25] } as {
  min: [number, number, number];
  max: [number, number, number];
};

describe("resolveCropClip", () => {
  it("rests where it clips nothing", () => {
    const clip = resolveCropClip(null, new THREE.Matrix4(), shape);
    expect(clip.min).toEqual([-CLIP_UNBOUNDED, -CLIP_UNBOUNDED, -CLIP_UNBOUNDED]);
    expect(clip.max).toEqual([CLIP_UNBOUNDED, CLIP_UNBOUNDED, CLIP_UNBOUNDED]);
  });

  it("is the layer's share of the box in base voxels", () => {
    expect(resolveCropClip(box, new THREE.Matrix4(), shape)).toEqual(box);
  });

  it("inverts for a layer outside the box, which the shader discards", () => {
    const clip = resolveCropClip(
      { min: [500, 0, 0], max: [600, 10, 10] },
      new THREE.Matrix4(),
      shape,
    );
    expect(clip.min[0]).toBeGreaterThan(clip.max[0]);
  });
});

describe("the probe's crop (shader lockstep)", () => {
  it("clips the ray to the same box, in the unit-box frame", () => {
    const clip = localCropClip(box, new THREE.Matrix4(), shape);
    expect(clip).not.toBe("outside");
    expect(clip).not.toBeNull();
    const local = clip as Exclude<typeof clip, "outside" | null>;
    expect(local.min.x).toBeCloseTo(-0.4);
    expect(local.max.x).toBeCloseTo(-0.1);

    // A ray down +x through the box's y/z: enters and leaves at the box's faces.
    const origin = new THREE.Vector3(-2, -0.1, -0.2);
    const direction = new THREE.Vector3(1, 0, 0);
    const whole = intersectLocalVolumeBox(origin, direction)!;
    const cut = intersectLocalVolumeBox(origin, direction, local)!;
    expect(whole.start).toBeCloseTo(1.5);
    expect(cut.start).toBeCloseTo(1.6);
    expect(cut.end).toBeCloseTo(1.9);
    // A ray that crosses the volume but misses the box reads nothing.
    expect(intersectLocalVolumeBox(new THREE.Vector3(-2, 0.4, 0), direction, local)).toBeNull();
  });

  it("reports a layer outside the box, and no crop", () => {
    expect(localCropClip(null, new THREE.Matrix4(), shape)).toBeNull();
    expect(
      localCropClip({ min: [500, 0, 0], max: [600, 1, 1] }, new THREE.Matrix4(), shape),
    ).toBe("outside");
  });
});
