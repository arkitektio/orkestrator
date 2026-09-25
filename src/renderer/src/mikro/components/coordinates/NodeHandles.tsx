import { Handle, Position } from "@xyflow/react";
import { Side, sourceHandleId, targetHandleId } from "./handles";

const POSITION: Record<Side, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

const SIDES: Side[] = ["top", "right", "bottom", "left"];

/**
 * All eight handles stacked on the node's centre point.
 *
 * React Flow normally parks a handle on the rim of the side it names, which on
 * a circle is wrong twice over: the rim is only tangent to the line at one
 * angle, so an edge leaving the "right" handle towards a node up and to the
 * right attaches off-centre and reads as a line that missed; and eight rim
 * points make the same node look like it has eight different sockets.
 *
 * Collapsed to the centre, every edge on a node aims at one point — the circle
 * becomes the hub it already looked like, and lines radiate from it at whatever
 * angle their neighbour actually sits at.
 *
 * The side is still named, and still matters: `position` is what React Flow
 * gives the bezier its control-point direction from, so a "right" source leaves
 * rightwards even though it starts dead centre. That is the whole trick — the
 * handles are VIRTUAL ports, a direction with no place of its own.
 */
const CENTRED: React.CSSProperties = {
  // All four offsets, because React Flow's per-side class sets whichever one
  // corresponds to its position (`right: -4px` and so on) — overriding only
  // `left`/`top` would leave that one fighting it.
  left: "50%",
  top: "50%",
  right: "auto",
  bottom: "auto",
  transform: "translate(-50%, -50%)",
};

export const NodeHandles = ({ className }: { className?: string }) => (
  <>
    {SIDES.map((side) => (
      <span key={side}>
        <Handle
          type="target"
          id={targetHandleId(side)}
          position={POSITION[side]}
          style={CENTRED}
          className={className ?? "!h-1 !w-1 !border-0 !bg-transparent"}
        />
        <Handle
          type="source"
          id={sourceHandleId(side)}
          position={POSITION[side]}
          style={CENTRED}
          className={className ?? "!h-1 !w-1 !border-0 !bg-transparent"}
        />
      </span>
    ))}
  </>
);

export default NodeHandles;
