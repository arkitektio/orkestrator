import { useGetCoordinateGraphQuery } from "@/mikro/api/graphql";
import type { PanelPosition } from "@xyflow/react";
import CoordinateGraphFlow from "./CoordinateGraphFlow";

/**
 * The connected component of the coordinate graph around one system, rendered
 * as a flow. Reachability is undirected — a calibration pointing *into* the
 * system you started from belongs to its component just as much as an edge
 * pointing out — so the walk shows a dataset's whole neighbourhood: its pyramid
 * levels, its calibrations, and the scenes it is registered into.
 */
/**
 * How far the walk goes when a caller does not say.
 *
 * `maxDepth` is optional on the server and an absent one walks the WHOLE
 * connected component — and the schema is blunt about what that costs here:
 * `coordinateGraph` "crosses every edge touching a space, so a registration
 * pulls in everything else registered into the same world". Opening one tile
 * therefore reached the stage frame, then every other tile on that stage, then
 * each of their pyramid levels and lenses as resident nodes of their own, then
 * the world and everything else adopting it. Hundreds of nodes to answer
 * "where does this thing sit".
 *
 * Two is that question's actual answer: from a dataset's grid it reaches the
 * calibration and the stage frame it registers into — its neighbourhood —
 * and stops before the shared world drags the rest of the instrument in.
 *
 * This also makes CoordinateGraphFlow's dropped-edge counter mean something.
 * It has always rendered "N not drawn (endpoint outside the walk)", which was
 * unreachable while the walk had no edge to fall outside of.
 */
export const DEFAULT_MAX_DEPTH = 2;

export const CoordinateGraphView = ({
  coordinateSystem,
  maxDepth = DEFAULT_MAX_DEPTH,
  legendPosition,
}: {
  coordinateSystem: string;
  /** Defaults to {@link DEFAULT_MAX_DEPTH}; pass a number to widen or narrow. */
  maxDepth?: number;
  /** Passed through: the caller owns whichever corner it draws in itself. */
  legendPosition?: PanelPosition;
}) => {
  const { data, loading, error } = useGetCoordinateGraphQuery({
    variables: { coordinateSystem, maxDepth },
  });

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Walking the coordinate graph…
      </div>
    );
  }

  return (
    <CoordinateGraphFlow
      graph={data.coordinateGraph}
      legendPosition={legendPosition}
    />
  );
};

export default CoordinateGraphView;
