import React from "react";
import { useNodes, BezierEdge } from "react-flow-renderer";
import { StreamKind } from "../../../fluss/api/graphql";
import { LabeledEdgeProps } from "../../types";
import { useEditRiver } from "../context";
import {
  getSmartEdge,
  svgDrawSmoothLinePath,
  svgDrawStraightLinePath,
  pathfindingJumpPointNoDiagonal,
} from "@tisoap/react-flow-smart-edge";

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
        style={style}
        className="react-flow__edge-path"
        d={svgPathString}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
      <text>
        <textPath
          href={`#${id}`}
          style={{ fontSize: "13px", fill: "white" }}
          startOffset="50%"
          textAnchor="middle"
          className="group"
        >
          {data?.stream
            .map(
              (item) =>
                (item?.kind == StreamKind.List
                  ? "[ " + item?.child?.identifier + " ]" || item?.kind
                  : item?.identifier || item?.kind) +
                (item?.nullable ? "?" : "")
            )
            .join(" | ")}
          <tspan
            onClick={() => removeEdge(id)}
            style={{ fontSize: "13px", fill: "red" }}
            className="hidden group-hover:block cursor-pointer"
          >
            X
          </tspan>
        </textPath>
      </text>
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
