import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import { PathEdgePresentation, useEdgeStrokeStyle } from "../../components/PathEdgePresentation";
import {
  ReagentRoleEdge
} from "../../types";
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
}: EdgeProps<ReagentRoleEdge>) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const strokeStyle = useEdgeStrokeStyle(id);

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  let path = "";
  const offset = 0;

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
          className="ring-2 ring-blue ring-chart-3"
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
