import React from "react";
import { getBezierPath } from "react-flow-renderer";
import { RunEventType } from "../../../fluss/api/graphql";
import { LabeledEdgeProps } from "../../types";
import { useMonitorRiver } from "../context";

export const colorForStyle: { [key in RunEventType]: string } = {
  COMPLETE: "rgb(187, 247, 208)",
  NEXT: "rgb(30 58 138)",
  ERROR: "#F00",
  UNKNOWN: "#FFF",
};

export const LabeledTrackEdge: React.FC<LabeledEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  source,
  sourceHandleId,
  data,
}) => {
  const color = "white";

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
        d={edgePath}
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
