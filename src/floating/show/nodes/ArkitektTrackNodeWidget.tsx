import React from "react";
import "react-contexify/dist/ReactContexify.css";
import { Handle, Position } from "react-flow-renderer";
import { NavLink } from "react-router-dom";
import ReactTooltip from "react-tooltip";
import { NodeKind, useDetailNodeQuery } from "../../../arkitekt/api/graphql";
import { withArkitekt } from "../../../arkitekt/arkitekt";
import { Node } from "../../../linker";
import { useNodeLayout, withLayout } from "../../base/node/layout";
import { ArkitektNodeProps } from "../../types";
import { NodeShowLayout } from "./layout/NodeTrack";

export const ArkitektTrackNodeWidget: React.FC<ArkitektNodeProps> = withLayout(
  ({ data, id }) => {
    const { data: node_data, error } = withArkitekt(useDetailNodeQuery)({
      variables: { package: data.package, interface: data.interface },
    });
    const { isExpanded, toggleExpanded } = useNodeLayout();

    const border =
      data.kind === NodeKind.Generator
        ? "1px solid #ff0033"
        : "1px solid #ff00ff";

    if (error) {
      return <NodeShowLayout id={id}>NOT AVAIALBLES</NodeShowLayout>;
    }

    return (
      <NodeShowLayout
        id={id}
        color={data.kind == NodeKind.Generator ? "pink" : "red"}
      >
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
          />
        ))}
        {node_data?.node?.id && (
          <>
            <Node.DetailLink
              className="flex-initial font-light text-xl mb-1 custom-drag-handle cursor-pointer truncate"
              object={node_data?.node?.id}
            >
              {node_data?.node?.name}{" "}
            </Node.DetailLink>
            <p className="flex-initial text-xs font-extralight truncate">
              {node_data?.node?.package}/{node_data?.node?.package}
            </p>
          </>
        )}
        {isExpanded && (
          <>
            <div
              className={"px-2 py-2 flex-grow flex flex-col overflow-hidden"}
            ></div>
          </>
        )}
      </NodeShowLayout>
    );
  }
);
