import React, { useState } from "react";
import { Handle, Position } from "reactflow";
import ReactTooltip from "react-tooltip";
import { withLayout } from "../../../base/node/layout";
import { ReturnNodeProps } from "../../../types";
import { NodeEditLayout } from "../layout/NodeEdit";

export const ReturnEditNodeWidget: React.FC<ReturnNodeProps> = withLayout(
  ({ data: { outstream, instream }, id }) => {
    const [show, setShow] = useState(false);

    const [isSmall, setIsSmall] = useState(true);

    return (
      <>
        <NodeEditLayout color="red" id={id}>
          <div className="px-2 py-2">
            <div
              className="font-light text-xl custom-drag-handle cursor-pointer"
              onDoubleClick={() => setIsSmall(!isSmall)}
            >
              Outputs
            </div>
            <p className="text-gray-700 text-base">
              {!isSmall && (
                <button
                  type="button"
                  className="rounded px-2 py-1 text-xs font-semibold border-gray-300"
                  onClick={() => setShow(true)}
                >
                  Add Documentation
                </button>
              )}
            </p>
          </div>
        </NodeEditLayout>
        {instream.map((s, index) => (
          <Handle
            type="target"
            position={Position.Left}
            id={"arg_" + index}
            style={{
              top: "50%",
              height: "50%",
              zIndex: "-1",
              borderRadius: "3px",
              cursor: "pointer",
              //boxShadow: "0px 0px 10px #ff1493",
            }}
            data-tip={s && s.map((s) => s?.kind).join(" | ")}
            data-for={"tooltip" + id}
          />
        ))}
        <ReactTooltip id={"tooltip" + id} />
      </>
    );
  }
);
