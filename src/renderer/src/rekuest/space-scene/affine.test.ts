import {Matrix4, Quaternion, Vector3} from 'three';
import {describe, expect, it} from 'vitest';
import {freeSpot, fromMatrix4, readPose, SPOT_SPACING, toMatrix4, writePose} from './affine';

const at = (x: number, y: number, z: number) => fromMatrix4(new Matrix4().setPosition(x, y, z));

describe('a placement affine', () => {
  it('is stored in rows, with the position in the last column', () => {
    const affine = at(1, 2, 3);
    expect(affine.map(row => row[3])).toEqual([1, 2, 3, 1]);
    expect(new Vector3().setFromMatrixPosition(toMatrix4(affine)).toArray()).toEqual([1, 2, 3]);
  });

  it('is the origin when a placement was never placed or is malformed', () => {
    for (const broken of [null, undefined, [], [[1, 2], [3, 4]], 'nope']) {
      expect(toMatrix4(broken).equals(new Matrix4())).toBe(true);
    }
  });

  it('reads and writes a position and a turn', () => {
    const affine = writePose(at(0, 0, 0), {x: 0.25, y: 0, z: -1.5, turn: 90});
    expect(readPose(affine)).toEqual({x: 0.25, y: 0, z: -1.5, turn: 90});
  });

  it('keeps the scale a placement had when it is moved', () => {
    const scaled = fromMatrix4(new Matrix4().makeScale(2, 2, 2));
    const moved = toMatrix4(writePose(scaled, {x: 1, y: 0, z: 0, turn: 45}));
    const scale = new Vector3();
    moved.decompose(new Vector3(), new Quaternion(), scale);
    expect(scale.x).toBeCloseTo(2);
  });
});

describe('a free spot', () => {
  it('is the origin in an empty space', () => {
    expect(readPose(freeSpot([]))).toEqual({x: 0, y: 0, z: 0, turn: 0});
  });

  it('is beside what already stands there', () => {
    expect(readPose(freeSpot([at(0, 0, 0), at(SPOT_SPACING, 0, 0), null])).x).toBe(2 * SPOT_SPACING);
  });

  it('fills a gap that was left', () => {
    expect(readPose(freeSpot([at(0, 0, 0), at(2 * SPOT_SPACING, 0, 0)])).x).toBe(SPOT_SPACING);
  });
});
