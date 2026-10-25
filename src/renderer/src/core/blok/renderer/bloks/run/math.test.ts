import {Matrix4, Quaternion, Vector3} from 'three';
import {describe, expect, it} from 'vitest';
import {fromMatrix4} from '@/core/model/affine';
import {progressFraction, resolveAnchors, ROUTE_LIFT, routePoints, splitRoute, throughKeys} from './math';

const arm = {id: 'a1', name: 'Arm'};
const ot2 = {id: 'a2', name: 'OT-2'};
const scope = {id: 'a3', name: 'Scope'};

/** A placement 1 m along x, turned a quarter around the vertical. */
const turned = fromMatrix4(
  new Matrix4().compose(new Vector3(1, 0, 2), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2), new Vector3(1, 1, 1)),
);
const placements: Record<string, unknown> = {a1: turned, a2: fromMatrix4(new Matrix4().setPosition(3, 0, 0))};
const placementOf = (id: string) => placements[id] ?? null;

describe('where an At draws', () => {
  it('stands at the placement of each placed agent, turned as it is', () => {
    const {placed, unplaced} = resolveAnchors([arm], placementOf);
    expect(unplaced).toEqual([]);
    expect(placed).toHaveLength(1);
    const position = new Vector3();
    const rotation = new Quaternion();
    placed[0].matrix.decompose(position, rotation, new Vector3());
    expect(position.toArray()).toEqual([1, 0, 2]);
    expect(rotation.angleTo(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2))).toBeCloseTo(0);
  });

  it('sends an agent the space does not place to the tray', () => {
    const {placed, unplaced} = resolveAnchors([arm, scope], placementOf);
    expect(placed.map(anchor => anchor.agent)).toEqual([arm]);
    expect(unplaced).toEqual([scope]);
  });

  it('draws at every agent of a key bound to several', () => {
    expect(resolveAnchors([arm, ot2], placementOf).placed.map(anchor => anchor.agent.id)).toEqual(['a1', 'a2']);
  });
});

describe('the keys a Route runs through', () => {
  it('reads them as BSX writes a list, as JSON, as plain text, or as a list', () => {
    expect(throughKeys("['robot', 'opentrons', 'frame', 'robot']")).toEqual(['robot', 'opentrons', 'frame', 'robot']);
    expect(throughKeys('["robot"]')).toEqual(['robot']);
    expect(throughKeys('robot, frame')).toEqual(['robot', 'frame']);
    expect(throughKeys(['robot', 'frame', 3])).toEqual(['robot', 'frame']);
    expect(throughKeys(undefined)).toEqual([]);
  });

  it('runs through the first agent of each key, over the floor, skipping what is not placed', () => {
    const agents: Record<string, typeof arm[]> = {robot: [arm, ot2], frame: [scope], opentrons: [ot2]};
    const points = routePoints(['robot', 'frame', 'opentrons', 'robot'], key => agents[key] ?? [], placementOf);
    expect(points.map(point => point.toArray())).toEqual([
      [1, ROUTE_LIFT, 2],
      [3, ROUTE_LIFT, 0],
      [1, ROUTE_LIFT, 2],
    ]);
  });
});

describe('how far along a Route the run is', () => {
  const points = [new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(1, 0, 3)];

  it('reads the run\'s progress as a share of 100', () => {
    expect(progressFraction(25)).toBe(0.25);
    expect(progressFraction(140)).toBe(1);
    expect(progressFraction('x')).toBe(0);
  });

  it('cuts the line where that share of its length lies behind', () => {
    const half = splitRoute(points, 0.5);
    expect(half.head?.toArray()).toEqual([1, 0, 1]);
    expect(half.travelled.map(point => point.toArray())).toEqual([[0, 0, 0], [1, 0, 0], [1, 0, 1]]);
    expect(half.ahead.map(point => point.toArray())).toEqual([[1, 0, 1], [1, 0, 3]]);
  });

  it('stands at the ends at 0 and 1, and has no head with fewer than two corners', () => {
    expect(splitRoute(points, 0).head?.toArray()).toEqual([0, 0, 0]);
    expect(splitRoute(points, 1).head?.toArray()).toEqual([1, 0, 3]);
    expect(splitRoute(points.slice(0, 1), 0.5).head).toBeNull();
  });
});
