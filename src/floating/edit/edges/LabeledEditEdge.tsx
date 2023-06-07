import React from "react";
import { AiOutlineClose } from "react-icons/ai";
import { EdgeLabelRenderer, getSmoothStepPath } from "reactflow";
import {
  StreamItemChild,
  StreamItemFragment,
  StreamKind,
} from "../../../fluss/api/graphql";
import { LabeledEdgeProps } from "../../types";
import { notEmpty } from "../../utils";
import { useEditRiver } from "../context";

const foreignObjectSize = 200;

const to_child_name = (stream: StreamItemChild): string => {
  return (
    (stream?.kind == StreamKind.List && stream.child
      ? "[ " + to_child_name(stream.child) + " ]"
      : stream?.identifier || stream?.kind) + (stream?.nullable ? "?" : "")
  );
};

const to_stream_name = (item: StreamItemFragment) => {
  return (
    (item?.kind == StreamKind.List && item.child
      ? "[ " + to_child_name(item.child) + " ]"
      : item?.identifier || item?.kind) + (item?.nullable ? "?" : "")
  );
};

export const LabeledEditEdge: React.FC<LabeledEdgeProps> = (props) => {
  const { removeEdge } = useEditRiver();

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
          {data?.stream.filter(notEmpty).map((item, index) => (
            <div className="text-xs " key={index}>
              {to_stream_name(item)}
            </div>
          ))}

          <div onClick={() => removeEdge(id)}>
            <AiOutlineClose className="text-red-400 group-hover:block hidden" />
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );

  // return (
  //   <>
  //     <path
  //       id={id}
  //       style={style}
  //       className="react-flow__edge-path "
  //       d={edgePath}
  //     />
  //     <text>
  //       <textPath
  //         href={`#${id}`}
  //         style={{ fontSize: "13px", fill: "white" }}
  //         startOffset="50%"
  //         textAnchor="middle"
  //         className="group"
  //       >
  //         {data?.stream
  //           .map((item) =>
  //             item?.kind == StreamKind.List
  //               ? "[ " + item?.child?.identifier + " ]" || item?.kind
  //               : item?.identifier || item?.kind
  //           )
  //           .join(" | ")}
  //         <tspan
  //           onClick={() => removeEdge(id)}
  //           style={{ fontSize: "13px", fill: "red" }}
  //           className="hidden group-hover:block cursor-pointer"
  //         >
  //           X
  //         </tspan>
  //       </textPath>
  //     </text>
  //   </>
  // );
};
