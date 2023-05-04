import React from "react";
import { EdgeLabelRenderer, getSmoothStepPath } from "reactflow";
import { StreamKind } from "../../../fluss/api/graphql";
import { LabeledEdgeProps } from "../../types";

const foreignObjectSize = 200;

export const LabeledMonitorEdge: React.FC<LabeledEdgeProps> = (props) => {
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
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="flex flex-row group m-auto hover:bg-gray-500 bg-gray-800 border-[#555] border rounded-lg shadow-lg p-1 cursor-pointer select-none text-gray-400 left[-75px] hover:text-gray-200 "
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
