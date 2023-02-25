import React from "react";
import { useNodes, BezierEdge, getSmoothStepPath } from "reactflow";
import { StreamKind } from "../../../fluss/api/graphql";
import { LabeledEdgeProps } from "../../types";
import { useEditRiver } from "../context";
import {
  getSmartEdge,
  svgDrawSmoothLinePath,
  svgDrawStraightLinePath,
  pathfindingJumpPointNoDiagonal,
} from "@tisoap/react-flow-smart-edge";
import { AiOutlineClose } from "react-icons/ai";

const foreignObjectSize = 200;

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

  const nodes = useNodes();

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
                  ? "[ " + item?.child?.identifier + " ]" || item?.kind
                  : item?.identifier || item?.kind) +
                  (item?.nullable ? "?" : "")}
              </span>
            ))}
            <div className="absolute group-hover:opacity-100 opacity-0 color-red-500 rounded-lg shadow-lg p-1 cursor-pointer select-none top-0 right-0 translate-y-[-50%] translate-x-[50%] transition-opacity duration-500 ease-in-out">
              <span onClick={() => removeEdge(id)}>
                <AiOutlineClose className="text-red-400" />
              </span>
            </div>
          </div>
        </div>
      </foreignObject>
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
