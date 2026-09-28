import { DESIRED_EDGE_LENGTH, NODE_DIAMETER } from "./nodeSize";

/**
 * Two ELK layouts, chosen by size. Both are ELK's — nothing here places a node.
 *
 * STRESS is the honest picture of this data. Stress majorization places every
 * node so the distance drawn between two of them matches the distance through
 * the graph: every transformation is a spring at its rest length, every space
 * sits where all its springs are least unhappy. What registers into what is a
 * web — a calibration reaching in, a stage frame a hundred tiles share — and a
 * tree layout imposes a parent-child order the schema does not have. DisCo
 * wraps it so a component the depth-bounded walk left as an island is packed
 * against the rest rather than stranded.
 *
 * It is also superlinear, and `elk.bundled.js` runs on the calling thread, so
 * the cost is a hard main-thread stall. Measured here, median of three:
 *
 *     15 nodes   58ms       75 nodes    678ms
 *     30 nodes  120ms       90 nodes    977ms
 *     45 nodes  251ms      120 nodes   1730ms
 *     60 nodes  438ms      150 nodes   3075ms
 *     (and 600 nodes: 42s — the freeze this used to cause unconditionally)
 *
 * TREE (mrtree) is what the kraph path graph has always used and never been
 * slow with: 606 nodes in 205ms, near enough linear. It buys that by picking a
 * root and imposing a direction — the very order stress refuses to invent — so
 * it is the fallback, not the default.
 */

// Where the stall stops being worth the better picture. At 60 nodes stress
// costs ~440ms once, on mount, which is a perceptible hitch but not a freeze;
// one step further and it doubles. Tune this here — it is the only number that
// decides which layout a graph gets.
export const STRESS_NODE_LIMIT = 60;

// Stress ignores node sizes entirely, which is why every node claims the same
// square footprint (see nodeSize.ts) whatever circle it draws inside: one rest
// length comfortably above one footprint is what keeps circles off each other.
const STRESS_OPTIONS = {
  "elk.algorithm": "disco",
  "elk.disco.componentCompaction.strategy": "POLYOMINO",
  "elk.disco.componentCompaction.componentLayoutAlgorithm": "stress",
  "elk.stress.desiredEdgeLength": String(DESIRED_EDGE_LENGTH),
  "elk.spacing.nodeNode": String(NODE_DIAMETER / 2),
};

// mrtree DOES honour node sizes, so here the spacing is a real guarantee rather
// than a consequence of the rest length: measured minimum gap is 224px against
// a 112px footprint.
//
// NOTE: `elk.mrtree.spacing.nodeNodeBetweenLevels` is inert in elkjs 0.9.3 —
// setting it changes nothing, verified against this graph. Level spacing comes
// out of `elk.spacing.nodeNode` alone, so it is the only spacing set here.
const TREE_OPTIONS = {
  "elk.algorithm": "mrtree",
  "elk.spacing.nodeNode": String(NODE_DIAMETER),
  "elk.direction": "RIGHT",
};

/**
 * The options for a graph of `nodeCount` nodes — residents included, since they
 * are nodes of the layout like any other and are most of the count.
 */
export const layoutOptionsFor = (nodeCount: number) =>
  nodeCount <= STRESS_NODE_LIMIT ? STRESS_OPTIONS : TREE_OPTIONS;
