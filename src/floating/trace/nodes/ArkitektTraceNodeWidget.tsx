import React from "react";
import "react-contexify/dist/ReactContexify.css";
import ReactTooltip from "react-tooltip";
import { Handle, Position } from "reactflow";
import { ContractPulse } from "../../../fluss/components/ContractPulse";
import { withRekuest } from "../../../rekuest";
import { NodeKind, useDetailNodeQuery } from "../../../rekuest/api/graphql";
import { useNodeLayout, withLayout } from "../../base/node/layout";
import { ArkitektNodeProps } from "../../types";
import { useTraceRiver } from "../context";
import { NodeTraceLayout } from "./layout/NodeTrack";

export const ArkitektTraceNodeWidget: React.FC<ArkitektNodeProps> = withLayout(
  ({ data, id }) => {
    const { conditionState } = useTraceRiver();
    const { data: node_data, error } = withRekuest(useDetailNodeQuery)({
      variables: { hash: data.hash },
    });
    const { isExpanded, toggleExpanded } = useNodeLayout();

    const latestEvent = conditionState?.events?.find((e) => e?.source === id);

    const border =
      data.kind === NodeKind.Generator
        ? "1px solid #ff0033"
        : "1px solid #ff00ff";

    return (
      <NodeTraceLayout id={id}>
        {data.instream.map((s, index) => (
          <Handle
            type="target"
            position={Position.Left}
            id={"arg_" + index}
            style={{
              top: "50%",
              zIndex: "-1",
              cursor: "pointer",
              //boxShadow: "0px 0px 10px #ff1493",
            }}
            data-tip={
              s && s.length > 0
                ? s.map((s) => `${s?.kind} ${s?.key}`).join("|")
                : "Event"
            }
            data-for={"tooltip" + id}
          ></Handle>
        ))}
        {data.outstream.map((s, index) => (
          <Handle
            type="source"
            position={Position.Right}
            id={"return_" + index}
            style={{
              top: "50%",
              zIndex: "-1",
              cursor: "pointer",
              //boxShadow: "0px 0px 10px #ff1493",
            }}
            data-tip={
              s && s.length > 0
                ? s.map((s) => `${s?.kind} ${s?.key}`).join("|")
                : "Event"
            }
            data-for={"tooltip" + id}
          />
        ))}
        <ReactTooltip id={"tooltip" + id} />
        <div
          className="flex-initial font-light text-xl mb-1 custom-drag-handle cursor-pointer truncate"
          onDoubleClick={() => toggleExpanded()}
        >
          <div className="w-full flex flex-row  gap-2">
            <ContractPulse status={latestEvent?.state} />{" "}
            {node_data?.node?.name || data.name}{" "}
          </div>
        </div>
        <p className="flex-initial text-xs font-extralight truncate">
          {node_data?.node?.description}
        </p>
      </NodeTraceLayout>
    );
  }
);
