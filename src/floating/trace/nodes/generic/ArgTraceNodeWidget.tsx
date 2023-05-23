import React, { useState } from "react";
import ReactTooltip from "react-tooltip";
import { Handle, Position } from "reactflow";
import { RunEventFragment } from "../../../../fluss/api/graphql";
import { withLayout } from "../../../base/node/layout";
import { ArgNodeProps } from "../../../types";
import { useTraceRiver } from "../../context";
import { NodeTraceLayout } from "../layout/NodeTrack";

export const ArgTraceNodeWidget: React.FC<ArgNodeProps> = withLayout(
  ({ data: { outstream, instream }, id }) => {
    const { conditionState } = useTraceRiver();
    const [show, setShow] = useState(false);
    const [isSmall, setIsSmall] = useState(true);

    const [frozenevent, setFrozenEvent] = useState<
      RunEventFragment | null | undefined
    >();

    const latestEvent =
      frozenevent || conditionState?.events?.find((e) => e?.source === id);

    return (
      <>
        <NodeTraceLayout color="blue" id={id}>
          <div className="px-2 py-2">
            <div
              className="font-light text-xl custom-drag-handle cursor-pointer"
              onDoubleClick={() => setIsSmall(!isSmall)}
            >
              Inputs
            </div>
            <p className="text-base"></p>
          </div>
        </NodeTraceLayout>
        {outstream.map((s, index) => (
          <Handle
            type="source"
            position={Position.Right}
            id={"return_" + index}
            style={{ background: "#555" }}
            data-tip={s && s.map((s) => s?.key).join(" | ")}
            data-for={"tooltip" + id}
          />
        ))}
        <ReactTooltip id={"tooltip" + id} />
      </>
    );
  }
);
