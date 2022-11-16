import React, { useEffect } from "react";
import "react-contexify/dist/ReactContexify.css";
import { Handle, Position, useReactFlow } from "react-flow-renderer";
import ReactTooltip from "react-tooltip";
import { withLayout } from "../../base/node/layout";
import { ReactiveNodeProps } from "../../types";
import { NodeEditLayout } from "./layout/NodeEdit";
import { useUpdateNodeInternals } from "react-flow-renderer";
import { ReactiveImplementationModelInput } from "../../../fluss/api/graphql";
import { useEditRiver } from "../context";

const bigWidth = 300;

export const ReactiveEditNodeWidget: React.FC<ReactiveNodeProps> = ({
  data: { outstream, instream, constream, implementation },
  id,
}) => {
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    console.log("Update node internals", id, implementation);
    updateNodeInternals(id);
  }, [outstream, instream, constream]);

  return (
    <>
      {/* <AssignEventOverlay event={data.latestAssignEvent} />
				<ProvideEventOverlay event={data.latestProvideEvent} /> */}
      <div style={{ width: 40 }} className="custom-drag-handle">
        {implementation &&
          [
            ReactiveImplementationModelInput.Combinelatest,
            ReactiveImplementationModelInput.Withlatest,
          ].includes(implementation) && (
            <svg height="40" width="40">
              <polygon
                points="0,40 40,20 0,0"
                style={{
                  strokeWidth: 1,
                  stroke: "white",
                  fill: "var(--color-primary-300)",
                }}
              />
            </svg>
          )}
        {implementation &&
          [ReactiveImplementationModelInput.Split].includes(implementation) && (
            <svg height="40" width="40">
              <polygon
                points="0,20 40,40 40,0"
                style={{
                  strokeWidth: 1,
                  stroke: "white",
                  fill: "var(--color-primary-300)",
                }}
              />
            </svg>
          )}
        {implementation &&
          [ReactiveImplementationModelInput.Chunk].includes(implementation) && (
            <svg height="40" width="40">
              <polygon
                points="0,0 40,0 40,40 0,40"
                style={{
                  strokeWidth: 1,
                  stroke: "white",
                  fill: "var(--color-primary-300)",
                }}
              />
              <text>{implementation}</text>
            </svg>
          )}
        {implementation &&
          [ReactiveImplementationModelInput.ToList].includes(
            implementation
          ) && (
            <svg height="40" width="40">
              <polygon
                points="0,0 40,0 40,40 0,40"
                style={{
                  strokeWidth: 1,
                  stroke: "white",
                  fill: "var(--color-primary-300)",
                }}
              />
              <text>{implementation}</text>
            </svg>
          )}
        {implementation &&
          [ReactiveImplementationModelInput.Omit].includes(implementation) && (
            <svg height="40" width="40">
              <text>
                <textPath
                  style={{
                    fill: "var(--color-primary-50)",
                    fontSize: "13px",
                  }}
                >
                  {implementation}
                </textPath>
              </text>
              <polygon
                points="0,0 40,0 40,40 0,40"
                style={{
                  strokeWidth: 1,
                  stroke: "white",
                  fill: "var(--color-primary-300)",
                }}
              />
            </svg>
          )}
        {constream?.map((s, index, array) => (
          <Handle
            type="target"
            position={Position.Bottom}
            id={`kwarg_${index}`}
            key={index}
            style={{
              background: "#555",
              marginTop: 10,
              height: "1em",
            }}
          ></Handle>
        ))}
        {instream?.map((s, index, array) => (
          <Handle
            key={index}
            type="target"
            position={Position.Left}
            id={`arg_${index}`}
            style={{
              top: `${(100 / array.length) * index + 45 / array.length}%`,
              background: "#555",
              height: "1em",
            }}
          />
        ))}
        {outstream?.map((s, index, array) => (
          <Handle
            key={index}
            type="source"
            position={Position.Right}
            id={`return_${index}`}
            style={{
              top: `${(100 / array.length) * index + 46 / array.length}%`,
              background: "#555",
            }}
          />
        ))}
      </div>
    </>
  );
};
