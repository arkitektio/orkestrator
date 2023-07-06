import React, { useEffect } from "react";
import "react-contexify/dist/ReactContexify.css";
import { Handle, Position, useUpdateNodeInternals } from "reactflow";
import { ReactiveImplementationModelInput } from "../../../fluss/api/graphql";
import { ReactiveNodeProps } from "../../types";

const bigWidth = 300;

export const ReactiveNodeMonitorWidget: React.FC<ReactiveNodeProps> = ({
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
      <div className="custom-drag-handle">
        {implementation &&
          [
            ReactiveImplementationModelInput.Combinelatest,
            ReactiveImplementationModelInput.Withlatest,
            ReactiveImplementationModelInput.Zip,
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
          [ReactiveImplementationModelInput.Filter].includes(implementation) && (
            <div className="px-2 py-2 z-50 shadow-xl bg-white rounded-md dark:bg-gray-800 text-green-500 dark:text-green-200 text-black border w-full h-full border-green-500 shadow-green-500/50 dark:border-green-200 dark:shadow-green-200/10">
              <h1>{implementation}</h1>
            </div>
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
            <div className="px-2 py-2 z-50 shadow-xl bg-white rounded-md dark:bg-gray-800 text-green-500 dark:text-green-200 text-black border w-full h-full border-green-500 shadow-green-500/50 dark:border-green-200 dark:shadow-green-200/10">
              <h1>{implementation}</h1>
            </div>
          )}
        {implementation &&
          [ReactiveImplementationModelInput.Ensure].includes(
            implementation
          ) && (
            <div className="px-2 py-2 z-50 shadow-xl bg-white rounded-md dark:bg-gray-800 text-green-500 dark:text-green-200 text-black border w-full h-full border-green-500 shadow-green-500/50 dark:border-green-200 dark:shadow-green-200/10">
              <h1>!</h1>
            </div>
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
        {implementation &&
          [ReactiveImplementationModelInput.If].includes(implementation) && (
            <svg height="40" width="40">
              <text>
                <textPath
                  style={{
                    fill: "rgb(var(--color-primary-100))",
                    fontSize: "13px",
                  }}
                >
                  If
                </textPath>
              </text>
              <polygon
                points="0,0 40,0 40,40 0,40"
                style={{
                  strokeWidth: 1,
                  stroke: "white",
                  fill: "rgb(var(--color-primary-300))",
                }}
              />
            </svg>
          )}
        {implementation &&
          [ReactiveImplementationModelInput.And].includes(implementation) && (
            <svg height="40" width="40">
              <text>
                <textPath
                  style={{
                    fill: "rgb(var(--color-primary-100))",
                    fontSize: "13px",
                  }}
                >
                  And
                </textPath>
              </text>
              <polygon
                points="0,0 40,0 40,40 0,40"
                style={{
                  strokeWidth: 1,
                  stroke: "white",
                  fill: "rgb(var(--color-primary-300))",
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
