import {
  getSmartEdge,
  pathfindingJumpPointNoDiagonal,
  svgDrawStraightLinePath,
} from "@tisoap/react-flow-smart-edge";
import React from "react";
import { BezierEdge, getBezierPath, useNodes } from "reactflow";
import { RunEventType } from "../../../fluss/api/graphql";
import { LabeledEdgeProps } from "../../types";
import { useTrackRiver } from "../context";

export const colorForStyle: { [key in RunEventType]: string } = {
  COMPLETE: "rgb(187, 247, 208)",
  NEXT: "rgb(30 58 138)",
  ERROR: "#F00",
  UNKNOWN: "#FFF",
};

export const colorForLatestStyle: { [key in RunEventType]: string } = {
  COMPLETE: "rgb(187, 247, 208)",
  NEXT: "rgb(100 100 228)",
  ERROR: "#F00",
  UNKNOWN: "#FFF",
};

export const LabeledTrackEdge: React.FC<LabeledEdgeProps> = (props) => {
  const { runState } = useTrackRiver();

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

  const latestEvent = runState?.events?.find((e) => e?.source === source);
  const latestGlobalEvent = runState?.events
    ?.sort((a, b) => (b?.t || 0) - (a?.t || 0))
    .at(0);

  let color = latestEvent ? colorForStyle[latestEvent.type] : "white";
  color =
    latestEvent && latestEvent?.id == latestGlobalEvent?.id
      ? colorForLatestStyle[latestEvent.type]
      : color;

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
        className={`react-flow__edge-path transition-colors duration-300 ${
          latestEvent?.id == latestGlobalEvent?.id ? "animate-pulse" : ""
        }`}
        d={svgPathString}
        style={{ stroke: color }}
      />
      <text>
        <textPath
          href={`#${id}`}
          style={{ fontSize: "13px", fill: color }}
          className={` transition-colors duration-300 ${
            latestEvent?.id == latestGlobalEvent?.id ? "animate-pulse" : ""
          }`}
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
