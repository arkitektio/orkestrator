import {
  getSmartEdge,
  pathfindingJumpPointNoDiagonal,
  svgDrawStraightLinePath,
} from "@tisoap/react-flow-smart-edge";
import React from "react";
import { BezierEdge, getBezierPath, useNodes } from "react-flow-renderer";
import { RunEventType } from "../../../fluss/api/graphql";
import { LabeledEdgeProps } from "../../types";

export const colorForStyle: { [key in RunEventType]: string } = {
  COMPLETE: "rgb(187, 247, 208)",
  NEXT: "rgb(30 58 138)",
  ERROR: "#F00",
  UNKNOWN: "#FFF",
};

export const LabeledTrackEdge: React.FC<LabeledEdgeProps> = (props) => {
  const color = "white";

  const {
    id,
    sourcePosition,
    targetPosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
    source,
    style,
    markerStart,
    markerEnd,
    data,
  } = props;

  const nodes = useNodes();

  const getSmartEdgeResponse = getSmartEdge({
    sourcePosition,
    targetPosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
    nodes,
    options: {
      drawEdge: svgDrawStraightLinePath,
      generatePath: pathfindingJumpPointNoDiagonal,
    },
  });

  if (getSmartEdgeResponse === null) {
    return <BezierEdge {...props} />;
  }

  const { edgeCenterX, edgeCenterY, svgPathString } = getSmartEdgeResponse;

  return (
    <>
      <path
        id={id}
        d={svgPathString}
        style={{ stroke: color }}
        className="react-flow__edge-path"
      />
      <text>
        <textPath
          href={`#${id}`}
          style={{ fontSize: "13px", fill: color }}
          startOffset="50%"
          textAnchor="middle"
        >
          {data?.stream && data.stream.length > 0
            ? data.stream
                .map((item) => item?.identifier || item?.kind)
                .join(" | ")
            : "Event"}
        </textPath>
      </text>
    </>
  );
};
