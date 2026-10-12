import type {ModelJoint} from './glb';

/**
 * A joint state map applied through a model's joint table.
 *
 * Pure: turns `{name: value}` into the value each joint's pivot node is
 * driven to, resolving mimic joints and clamping to limits.
 */

export type JointPose = {
  /** What the pivot node is driven to: radians or meters from rest. */
  value: number;
  /** The published value lay outside the joint's limits and was clamped for display. */
  clamped: boolean;
};

export type JointResolution = {
  poses: Map<string, JointPose>;
  /** Names in the map that the model has no joint for. */
  unknown: string[];
};

const clamp = (joint: ModelJoint, value: number): JointPose => {
  if (!joint.limit) return {value, clamped: false};
  const bounded = Math.min(Math.max(value, joint.limit.lower), joint.limit.upper);
  return {value: bounded, clamped: bounded !== value};
};

/**
 * Resolve a (possibly partial) joint map.
 *
 * A joint missing from `values` keeps its entry in `previous`; a mimic joint
 * that is not given its own value follows the joint it mimics.
 */
export const resolveJoints = (
  joints: readonly ModelJoint[],
  values: Readonly<Record<string, number>>,
  previous: ReadonlyMap<string, JointPose> = new Map(),
): JointResolution => {
  const byName = new Map(joints.map(joint => [joint.name, joint]));
  const poses = new Map<string, JointPose>();
  const raw = new Map<string, number>();

  for (const joint of joints) {
    const value = values[joint.name];
    if (typeof value === 'number' && Number.isFinite(value)) raw.set(joint.name, value);
  }
  const rawOf = (joint: ModelJoint, seen: Set<string>): number | undefined => {
    const own = raw.get(joint.name);
    if (own !== undefined) return own;
    if (joint.mimic && !seen.has(joint.name)) {
      const source = byName.get(joint.mimic.joint);
      const driven = source ? rawOf(source, new Set(seen).add(joint.name)) : undefined;
      if (driven !== undefined) return joint.mimic.multiplier * driven + joint.mimic.offset;
    }
    return undefined;
  };
  for (const joint of joints) {
    const value = rawOf(joint, new Set());
    const kept = previous.get(joint.name);
    if (value !== undefined) poses.set(joint.name, clamp(joint, value));
    else if (kept) poses.set(joint.name, kept);
  }
  return {poses, unknown: Object.keys(values).filter(name => !byName.has(name)).sort()};
};
