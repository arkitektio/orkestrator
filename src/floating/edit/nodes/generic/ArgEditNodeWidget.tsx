import React, { useEffect, useState } from "react";
import ReactTooltip from "react-tooltip";
import { Handle, Position, useUpdateNodeInternals } from "reactflow";

import { withLayout } from "../../../base/node/layout";
import { ArgNodeProps } from "../../../types";
import { useEditRiver } from "../../context";
import { NodeEditLayout } from "../layout/NodeEdit";

export const ArgEditNodeWidget: React.FC<ArgNodeProps> = withLayout(
  ({ data: { outstream, instream, constream }, id }) => {
    const updateNodeInternals = useUpdateNodeInternals();
    const { nodes } = useEditRiver();
    const [isSmall, setIsSmall] = useState(true);

    useEffect(() => {
      console.log("Update node internals", id);
      updateNodeInternals(id);
    }, [outstream, instream, constream]);

    return (
      <>
        <NodeEditLayout color="blue" id={id}>
          <div className="px-2 py-2 ">
            <div
              className="font-light text-xl custom-drag-handle cursor-pointer"
              onDoubleClick={() => setIsSmall(!isSmall)}
            >
              Inputs{" "}
            </div>
            <p className="text-base">{!isSmall && <></>}</p>
          </div>
        </NodeEditLayout>
        {outstream.map((s, index) => (
          <Handle
            type="source"
            position={Position.Right}
            id={"return_" + index}
            style={{
              top: "50%",
              height: "50%",
              zIndex: "-1",
              borderRadius: "3px",
              cursor: "pointer",
              //boxShadow: "0px 0px 10px #ff1493",
            }}
            data-tip={s && s.map((s) => s?.key).join(" | ")}
            data-for={"tooltip" + id}
          />
        ))}
        <ReactTooltip id={"tooltip" + id} />
      </>
    );
  }
);
