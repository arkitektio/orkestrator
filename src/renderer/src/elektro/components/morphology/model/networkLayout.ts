import * as THREE from "three";
import { DetailNeuronModelFragment } from "../api/graphql";
import { toBase } from "@/lib/quantities";

/**
 * Geometry for the neuron model's "network" layer — the point processes that
 * are not part of the morphology tree:
 *
 * - **synapses** sit on a section (`location`) at a fractional `position`,
 * - **stimulators** are abstract spike sources with no coordinates, so we float
 *   them just outside the arbor near the synapses they drive,
 * - **connections** are edges from a stimulator to a synapse.
 *
 * All positions are derived from the already-computed section geometry, so the
 * network layer lines up exactly with the rendered cylinders.
 */

export type NetSynapse = NonNullable<
  DetailNeuronModelFragment["config"]["netSynapses"]
>[number];
export type NetStimulator = NonNullable<
  DetailNeuronModelFragment["config"]["netStimulators"]
>[number];
export type NetConnection = NonNullable<
  DetailNeuronModelFragment["config"]["netConnections"]
>[number];

/** The network-layer slice of a model config (viewer passes `model.config`; the
 *  editor passes its live net state). */
export type NetData = Pick<
  DetailNeuronModelFragment["config"],
  "netSynapses" | "netStimulators" | "netConnections"
>;

/** Per-section world geometry, keyed by section id. `radius` is the cylinder's
 *  radius in µm (diam / 2), used to lift synapses onto the mesh hull. */
export type SegmentGeom = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
};

// Amber = excitatory, sky = inhibitory, violet = stimulator source.
export const SYNAPSE_EXCITATORY_COLOR = "rgb(245, 158, 11)";
export const SYNAPSE_INHIBITORY_COLOR = "rgb(56, 189, 248)";
export const STIMULATOR_COLOR = "rgb(168, 85, 247)";

// Reversal potential (mV) at/above which a synapse reads as excitatory.
const EXC_THRESHOLD_MV = -30;

export type PlacedSynapse = {
  synapse: NetSynapse;
  point: THREE.Vector3;
  excitatory: boolean;
  color: string;
};
export type PlacedStimulator = {
  stim: NetStimulator;
  point: THREE.Vector3;
};
export type PlacedConnection = {
  connection: NetConnection;
  from: THREE.Vector3;
  to: THREE.Vector3;
  /** Conductance in base nS, or NaN when unset. */
  weight: number;
};

export type NetworkLayout = {
  synapses: PlacedSynapse[];
  stimulators: PlacedStimulator[];
  connections: PlacedConnection[];
  /** Synapses whose `location` matched no section (silently not placed). */
  unmatchedSynapses: number;
  /** Half-extent of the arbor around its centroid, for sizing markers. */
  arborRadius: number;
  /** Synapse/stimulator marker radius (world units). */
  markerRadius: number;
  hasData: boolean;
};

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);

/** A unit vector perpendicular to `axis` (any consistent choice). */
const getPerpendicular = (axis: THREE.Vector3): THREE.Vector3 => {
  const n = axis.clone().normalize();
  const helper = Math.abs(n.dot(UP)) > 0.9 ? RIGHT : UP;
  return new THREE.Vector3().crossVectors(n, helper).normalize();
};

const EMPTY: NetworkLayout = {
  synapses: [],
  stimulators: [],
  connections: [],
  unmatchedSynapses: 0,
  arborRadius: 0,
  markerRadius: 1.5,
  hasData: false,
};

export const buildNetworkLayout = (
  net: NetData,
  segmentGeom: Map<string, SegmentGeom>,
): NetworkLayout => {
  const rawSynapses = net.netSynapses ?? [];
  const rawStimulators = net.netStimulators ?? [];
  const rawConnections = net.netConnections ?? [];

  if (
    rawSynapses.length === 0 &&
    rawStimulators.length === 0 &&
    rawConnections.length === 0
  ) {
    return EMPTY;
  }

  // Arbor centroid + radius (used to float stimulators outward and size markers).
  const centroid = new THREE.Vector3();
  let n = 0;
  segmentGeom.forEach(({ start, end }) => {
    centroid.add(start).add(end);
    n += 2;
  });
  if (n > 0) centroid.multiplyScalar(1 / n);

  let arborRadius = 0;
  segmentGeom.forEach(({ start, end }) => {
    arborRadius = Math.max(
      arborRadius,
      start.distanceTo(centroid),
      end.distanceTo(centroid),
    );
  });

  const markerRadius = Math.max(arborRadius * 0.012, 1.5);

  // --- synapses on the morphology ---
  const synapses: PlacedSynapse[] = [];
  const synapsePoint = new Map<string, THREE.Vector3>();
  let unmatchedSynapses = 0;

  rawSynapses.forEach((synapse) => {
    const geom = segmentGeom.get(synapse.location);
    if (!geom) {
      unmatchedSynapses += 1;
      return;
    }
    // Anchor on the section's centerline, then lift out to the cylinder hull so
    // the marker sits on the membrane surface (never buried inside thick
    // sections). A per-synapse angle spreads co-located synapses around the
    // circumference instead of stacking them.
    const axis = geom.end.clone().sub(geom.start);
    const perp = getPerpendicular(axis);
    if (axis.lengthSq() > 1e-9) {
      const seed = synapse.id
        .split("")
        .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      perp.applyAxisAngle(axis.normalize(), (seed % 360) * (Math.PI / 180));
    }
    const point = geom.start
      .clone()
      .lerp(geom.end, clamp01(synapse.position))
      .add(perp.multiplyScalar(geom.radius + markerRadius));
    const eMv = toBase(synapse.e, "voltage", NaN);
    const excitatory = Number.isNaN(eMv) ? true : eMv >= EXC_THRESHOLD_MV;
    synapses.push({
      synapse,
      point,
      excitatory,
      color: excitatory ? SYNAPSE_EXCITATORY_COLOR : SYNAPSE_INHIBITORY_COLOR,
    });
    synapsePoint.set(synapse.id, point);
  });

  // --- stimulators: centroid of the synapses they drive, pushed outward ---
  const offset = Math.max(arborRadius * 0.25, 20);
  const stimulators: PlacedStimulator[] = [];
  const stimulatorPoint = new Map<string, THREE.Vector3>();

  rawStimulators.forEach((stim) => {
    const targets = rawConnections
      .filter((c) => c.netStimulator === stim.id)
      .map((c) => synapsePoint.get(c.synapse))
      .filter((p): p is THREE.Vector3 => Boolean(p));

    const base = new THREE.Vector3();
    if (targets.length > 0) {
      targets.forEach((p) => base.add(p));
      base.multiplyScalar(1 / targets.length);
    } else {
      base.copy(centroid);
    }

    const dir = base.clone().sub(centroid);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
    const point = base.add(dir.normalize().multiplyScalar(offset));

    stimulators.push({ stim, point });
    stimulatorPoint.set(stim.id, point);
  });

  // --- connections: stimulator -> synapse ---
  const connections: PlacedConnection[] = [];
  rawConnections.forEach((connection) => {
    const from = stimulatorPoint.get(connection.netStimulator);
    const to = synapsePoint.get(connection.synapse);
    if (!from || !to) return;
    connections.push({
      connection,
      from,
      to,
      weight: toBase(connection.weight, "conductance", NaN),
    });
  });

  return {
    synapses,
    stimulators,
    connections,
    unmatchedSynapses,
    arborRadius,
    markerRadius,
    hasData:
      synapses.length > 0 ||
      stimulators.length > 0 ||
      connections.length > 0,
  };
};
