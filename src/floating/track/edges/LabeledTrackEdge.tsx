import React from "react";
import { getSmoothStepPath } from "reactflow";
import { RunEventType, StreamKind } from "../../../fluss/api/graphql";
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

  const latestEvent = runState?.events?.find((e) => e?.source === props.source);
  const latestGlobalEvent = runState?.events
    ?.sort((a, b) => (b?.t || 0) - (a?.t || 0))
    .at(0);

  let color = latestEvent ? colorForStyle[latestEvent.type] : "white";
  color =
    latestEvent && latestEvent?.id == latestGlobalEvent?.id
      ? colorForLatestStyle[latestEvent.type]
      : color;

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
        style={{ ...style, stroke: color }}
        className={`react-flow__edge-path transition-colors duration-300 ${
          latestEvent?.id == latestGlobalEvent?.id ? "animate-pulse" : ""
        }`}
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
      <foreignObject x={labelX} y={labelY} width={150} height={150}>
        <div className="flex group">
          <div
            className="relative m-auto hover:bg-gray-500 bg-gray-800 border-[#555] border rounded-lg shadow-lg p-1 cursor-pointer select-none text-gray-400 left[-75px] hover:text-gray-200 flex-col flex  transition-all duration-500 ease-in-out"
            style={{ fontSize: "13px", fill: "white" }}
          >
            {data?.stream.map((item, index) => (
              <span className="text-xs" key={index}>
                {(item?.kind == StreamKind.List
                  ? "[ " + (item?.child?.identifier || item?.child?.kind) + " ]"
                  : item?.identifier || item?.kind) +
                  (item?.nullable ? "?" : "")}
              </span>
            ))}
          </div>
        </div>
      </foreignObject>
    </>
  );
};
