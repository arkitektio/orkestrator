import {Euler, Matrix4, Quaternion, Vector3} from 'three';

/**
 * Where a placement stands, as the server keeps it: a 4x4 affine matrix in
 * rows, in the scene's units (one unit is one meter, Y is up).
 */
export type Affine = number[][];

/** Where a placement stands, as a person reads it: a spot on the floor and a turn around the vertical. */
export type Pose = {x: number; y: number; z: number; turn: number};

const isAffine = (value: unknown): value is Affine =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every(row => Array.isArray(row) && row.length === 4 && row.every(Number.isFinite));

/** The matrix of a stored affine; the origin for a placement that was never placed or is malformed. */
export const toMatrix4 = (affine: unknown): Matrix4 => {
  const matrix = new Matrix4();
  if (!isAffine(affine)) return matrix;
  // `set` takes rows, as the affine is stored.
  return matrix.set(...(affine.flat() as Parameters<Matrix4['set']>));
};

export const fromMatrix4 = (matrix: Matrix4): Affine => {
  const e = matrix.elements;
  return [
    [e[0], e[4], e[8], e[12]],
    [e[1], e[5], e[9], e[13]],
    [e[2], e[6], e[10], e[14]],
    [e[3], e[7], e[11], e[15]],
  ];
};

const round = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  // `+ 0` turns -0 into 0, which a field would show as "-0".
  return Math.round(value * factor) / factor + 0;
};

/** Position in meters (to the millimeter) and the turn around Y in degrees. */
export const readPose = (affine: unknown): Pose => {
  const position = new Vector3();
  const quaternion = new Quaternion();
  toMatrix4(affine).decompose(position, quaternion, new Vector3());
  const turn = new Euler().setFromQuaternion(quaternion, 'YXZ').y;
  return {
    x: round(position.x, 3),
    y: round(position.y, 3),
    z: round(position.z, 3),
    turn: round((turn * 180) / Math.PI, 1),
  };
};

/** The affine with its position and turn replaced; any tilt and scale it had are kept. */
export const writePose = (affine: unknown, pose: Pose): Affine => {
  const quaternion = new Quaternion();
  const scale = new Vector3();
  toMatrix4(affine).decompose(new Vector3(), quaternion, scale);
  const euler = new Euler().setFromQuaternion(quaternion, 'YXZ');
  euler.y = (pose.turn * Math.PI) / 180;
  return fromMatrix4(
    new Matrix4().compose(new Vector3(pose.x, pose.y, pose.z), quaternion.setFromEuler(euler), scale),
  );
};

/** How far apart new placements are put down, in meters. */
export const SPOT_SPACING = 0.5;

/**
 * A spot on the floor nothing stands on yet: the first free one along a row
 * through the origin, so what is added never lands inside what is there.
 */
export const freeSpot = (taken: readonly unknown[]): Affine => {
  const positions = taken.map(affine => new Vector3().setFromMatrixPosition(toMatrix4(affine)));
  for (let index = 0; ; index += 1) {
    const spot = new Vector3(index * SPOT_SPACING, 0, 0);
    if (positions.every(position => position.distanceTo(spot) >= SPOT_SPACING / 2)) {
      return fromMatrix4(new Matrix4().setPosition(spot));
    }
  }
};

/** The size, in meters, a model is fitted to: a device on a bench, a little under a spot. */
export const FIT_SIZE = 0.4;

/** How far off a model's own size has to be before it is fitted on placing: ten times. */
export const AUTO_FIT_RATIO = 10;

/** The uniform scale of a placement: the largest of its axes, to four significant digits. */
export const readScale = (affine: unknown): number => {
  const scale = new Vector3();
  toMatrix4(affine).decompose(new Vector3(), new Quaternion(), scale);
  return Number(Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z)).toPrecision(4));
};

/** The affine scaled evenly to `scale`; its position and rotation are kept. */
export const writeScale = (affine: unknown, scale: number): Affine => {
  const position = new Vector3();
  const quaternion = new Quaternion();
  toMatrix4(affine).decompose(position, quaternion, new Vector3());
  return fromMatrix4(new Matrix4().compose(position, quaternion, new Vector3(scale, scale, scale)));
};

/** The scale that makes a model whose largest extent is `extent` meters {@link FIT_SIZE} large. */
export const fitScale = (extent: number): number => FIT_SIZE / extent;

/**
 * The scale a model is given when it is placed: a fit when its own size is
 * {@link AUTO_FIT_RATIO} times too large or too small for the room (a model
 * drawn in millimeters, say), `null` when it can stand as it was made.
 */
export const autoFitScale = (extent: number): number | null => {
  if (!(extent > 0) || !Number.isFinite(extent)) return null;
  const ratio = extent / FIT_SIZE;
  return ratio >= AUTO_FIT_RATIO || ratio <= 1 / AUTO_FIT_RATIO ? fitScale(extent) : null;
};
