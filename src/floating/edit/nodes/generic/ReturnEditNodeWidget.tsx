import React, { useState } from "react";
import { Handle, Position } from "react-flow-renderer";
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
              <>
                {instream[0]?.map((o) => o?.kind).join(" | ")}
                <br />
              </>
              {!isSmall && (
                <button
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
            id={"return_" + index}
            style={{ background: "#555" }}
            data-tip={s && s.map((s) => s?.kind).join(" | ")}
            data-for={"tooltip" + id}
          />
        ))}
        <ReactTooltip id={"tooltip" + id} />
      </>
    );
  }
);
