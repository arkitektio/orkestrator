import React from "react";
import { EdgeLabelRenderer, getSmoothStepPath } from "reactflow";
import { RunEventType, StreamKind } from "../../../fluss/api/graphql";
import { LabeledEdgeProps } from "../../types";

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

export const LabeledTraceEdge: React.FC<LabeledEdgeProps> = (props) => {
  const {
    id,
    sourcePosition,
    targetPosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style,
    markerStart,
    markerEnd,
    data,
  } = props;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourcePosition,
    targetPosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
        }}
        className={`react-flow__edge-path transition-colors duration-300 `}
        d={edgePath}
      />
      <text>
        <textPath
          href={`#${id}`}
          style={{ fontSize: "13px", fill: "white" }}
          startOffset="50%"
          textAnchor="middle"
          className="group"
        ></textPath>
      </text>
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className={`transition-all duration-500 flex flex-row group m-auto hover:bg-gray-500 bg-gray-800 border-[#555] border rounded-lg shadow-lg p-1 cursor-pointer select-none text-gray-400 left[-75px] hover:text-gray-200 `}
        >
          {data?.stream.map((item, index) => (
            <div className="text-xs " key={index}>
              {(item?.kind == StreamKind.List
                ? "[ " + (item?.child?.identifier || item?.child?.kind) + " ]"
                : item?.identifier || item?.kind) + (item?.nullable ? "?" : "")}
            </div>
          ))}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
