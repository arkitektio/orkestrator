import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  useStore,
  type EdgeProps,
  type ReactFlowState,
} from "@xyflow/react";
import { PathEdgePresentation, useEdgeStrokeStyle } from "../../components/PathEdgePresentation";
import { EntityRoleEdge } from "../../types";
import { getEdgeParams } from "../../utils";

export type GetSpecialPathParams = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
};

export const getSpecialPath = (
  { sourceX, sourceY, targetX, targetY }: GetSpecialPathParams,
  offset: number,
) => {
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  return `M ${sourceX} ${sourceY} Q ${centerX} ${centerY + offset
    } ${targetX} ${targetY}`;
};

export default ({
  id,
  data,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition: _sourcePosition,
  targetPosition: _targetPosition,
  markerEnd,
}: EdgeProps<EntityRoleEdge>) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const strokeStyle = useEdgeStrokeStyle(id);

  const theEdges = useStore((s: ReactFlowState) => {
    const edgeExists = s.edges.filter(
      (e) =>
        (e.source === source && e.target === target) ||
        (e.target === source && e.source === target),
    );
    return edgeExists;
  });

  const myIndex = theEdges.findIndex((e) => e.id == id) || 0;

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  let path = "";
  // Calculate offset based on whether there are multiple edges and the current edge's index
  const isMultipleEdges = theEdges.length > 1;
  const offset = isMultipleEdges
    ? (myIndex - (theEdges.length - 1) / 2) * 60
    : 0;

  path = getSpecialPath(
    { sourceX: sx, sourceY: sy, targetX: tx, targetY: ty },
    offset,
  );

  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        label={data?.role}
        style={strokeStyle}
      />
      <EdgeLabelRenderer>
        <PathEdgePresentation
          id={id}
          transform={`translate(-50%, -50%) translate(${centerX}px,${centerY + offset}px)`}
        >
          <div className="flex flex-row gap-2">
            <div className="text-muted-foreground">as</div>{" "}
            <div className="text-xs">{data?.role}</div>
          </div>
        </PathEdgePresentation>
      </EdgeLabelRenderer>
    </>
  );
};
