import React from "react";
import { Edge, EdgeProps, getBezierPath, getMarkerEnd } from "reactflow";
import { FancyEdgeProps } from "../../types";

export const FancyTrackEdge: React.FC<FancyEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}) => {
  const edgePath = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
      />
      <text>
        <textPath
          href={`#${id}`}
          style={{ fontSize: "13px", fill: "green" }}
          startOffset="50%"
          textAnchor="middle"
        >
          {data?.stream.map((item) => item?.kind).join(" | ")}
        </textPath>
      </text>
    </>
  );
};
