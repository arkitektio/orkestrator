/**
 * Which way an edge should leave a node.
 *
 * A layered layout has one answer — everything flows right — so fixed
 * left-in / right-out handles are correct by construction. A force layout has
 * no direction at all: a target can end up above, below or behind its source,
 * and an edge that insists on leaving the right side to reach a node on the
 * left doubles back across its own node.
 *
 * So every node offers a handle per side and the edge picks the pair facing
 * each other, once, from the positions the layout settled on. The sides are
 * VIRTUAL: `NodeHandles` stacks all of them on the node's centre, so what a
 * side names is the direction the curve sets off in, not a place on the rim.
 */

export type Side = "top" | "right" | "bottom" | "left";

export const sourceHandleId = (side: Side) => `${side}-source`;
export const targetHandleId = (side: Side) => `${side}-target`;

/**
 * The facing pair for an edge running (dx, dy) from source to target.
 *
 * Whichever axis dominates wins: a mostly-horizontal edge leaves a vertical
 * side, a mostly-vertical one leaves a horizontal side. Ties go to horizontal,
 * because the nodes are wider than they are tall.
 */
export const facingHandles = (
  dx: number,
  dy: number,
): { source: Side; target: Side } => {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { source: "right", target: "left" }
      : { source: "left", target: "right" };
  }
  return dy >= 0
    ? { source: "bottom", target: "top" }
    : { source: "top", target: "bottom" };
};
