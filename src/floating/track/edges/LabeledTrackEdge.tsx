import React, { useEffect } from "react";
import { EdgeLabelRenderer, getSmoothStepPath } from "reactflow";
import { RunEventType, StreamKind } from "../../../fluss/api/graphql";
import { Assignation } from "../../../linker";
import { withRekuest } from "../../../rekuest";
import { useReferencedAssignationsLazyQuery } from "../../../rekuest/api/graphql";
import { LabeledEdgeProps } from "../../types";
import { notEmpty } from "../../utils";
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
  const { runState, run } = useTrackRiver();

  const latestEvent = runState?.events?.find((e) => e?.source === props.source);

  const target = props.target;

  const [query, { data: assignation }] = withRekuest(
    useReferencedAssignationsLazyQuery
  )();

  useEffect(() => {
    if (run?.assignation && latestEvent?.t != undefined && target) {
      console.log("OINOoinsofinsoifnsoienf", `${target}_${latestEvent.t}`);
      query({
        variables: {
          parent: run?.assignation,
          reference: `${target}_${latestEvent.t}`,
        },
      });
    }
  }, [latestEvent?.t, run]);

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
        style={{
          ...style,
          stroke: color,
          strokeWidth: latestEvent?.id == latestGlobalEvent?.id ? 5 : 1,
        }}
        className={`react-flow__edge-path transition-colors duration-300 ${
          latestEvent?.id == latestGlobalEvent?.id ? "animate-pulse  " : ""
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
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className={`${
            latestEvent?.id == latestGlobalEvent?.id
              ? "opacity-100"
              : "opacity-0"
          } transition-all duration-500 flex flex-row group m-auto hover:bg-gray-500 bg-gray-800 border-[#555] border rounded-lg shadow-lg p-1 cursor-pointer select-none text-gray-400 left[-75px] hover:text-gray-200 `}
        >
          {data?.stream.map((item, index) => (
            <div className="text-xs " key={index}>
              {(item?.kind == StreamKind.List
                ? "[ " + (item?.child?.identifier || item?.child?.kind) + " ]"
                : item?.identifier || item?.kind) + (item?.nullable ? "?" : "")}
            </div>
          ))}
          {assignation?.assignations?.filter(notEmpty).map((assignation) => (
            <Assignation.DetailLink
              object={assignation.id}
              className="text-xs text-gray-200"
            >
              Open
            </Assignation.DetailLink>
          ))}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
