import { introspectionFromSchema } from "graphql";
import React, { useEffect, useState } from "react";
import { animation, Item, Menu, Separator } from "react-contexify";
import "react-contexify/dist/ReactContexify.css";
import { Handle, Position } from "react-flow-renderer";
import ReactTooltip from "react-tooltip";
import { withRekuest } from "../../../rekuest";
import { NodeKind, useDetailNodeQuery } from "../../../rekuest/api/graphql";
import { ConstantsForm } from "../../../rekuest/components/ConstantsForm";
import { useNodeLayout, withLayout } from "../../base/node/layout";
import { ArkitektNodeProps } from "../../types";
import { port_to_type as port_to_kind } from "../../utils";
import { useEditRiver } from "../context";
import { NodeEditLayout } from "./layout/NodeEdit";

export const ArkitektEditNodeWidget: React.FC<ArkitektNodeProps> = withLayout(
  ({ data, id }) => {
    const { updateNodeIn, updateNodeOut, updateNodeExtras } = useEditRiver();
    const { data: node_data, error } = withRekuest(useDetailNodeQuery)({
      variables: { hash: data.hash },
    });

    useEffect(() => {
      if (node_data) {
        updateNodeExtras(id, { ...data, extras: node_data.node });
      }
    }, [node_data]);

    const { isExpanded, toggleExpanded } = useNodeLayout();

    const handleItemClick = ({ event, props }: any) =>
      console.log(event, props);

    const border =
      data.kind === NodeKind.Generator
        ? "1px solid #ff0033"
        : "1px solid #ff00ff";

    const rotateArg = (arg: {
      __typename: string;
      key: string;
      identifier?: null | string;
      nullable: boolean;
    }) => {
      if (data?.instream[0]) {
        console.log("Stream", data.instream[0]);
        if (data?.instream[0]?.find((s) => s?.key === arg.key)) {
          updateNodeIn(id, [
            data.instream[0].filter((s) => s?.key !== arg.key),
          ]);
        } else {
          updateNodeIn(id, [
            data?.instream[0]?.concat({
              key: arg.key,
              kind: port_to_kind(arg),
              identifier: arg.identifier,
              nullable: arg.nullable,
            }),
          ]);
        }
      }
    };

    const rotateReturn = (arg: {
      __typename: string;
      key: string;
      identifier?: null | string;
      nullable: boolean;
    }) => {
      if (data?.outstream[0]) {
        console.log("Stream", data.outstream[0]);
        if (data?.outstream[0]?.find((s) => s?.key === arg.key)) {
          updateNodeOut(id, [
            data.outstream[0].filter((s) => s?.key !== arg.key),
          ]);
        } else {
          updateNodeOut(id, [
            data?.outstream[0]?.concat({
              key: arg.key,
              kind: port_to_kind(arg),
              identifier: arg.identifier,
              nullable: arg.nullable,
            }),
          ]);
        }
      }
    };

    if (error) {
      return <NodeEditLayout id={id}>NOT AVAIALBLES</NodeEditLayout>;
    }

    return (
      <NodeEditLayout
        id={id}
        color={node_data?.node?.kind === NodeKind.Function ? "pink" : "red"}
      >
        {data.instream.map((s, index) => (
          <Handle
            key={index}
            type="target"
            position={Position.Left}
            id={"arg_" + index}
            style={{
              top: "50%",
              height: "2em",
              zIndex: "900",
              cursor: "pointer",
              //boxShadow: "0px 0px 10px #ff1493",
            }}
            data-tip={
              s && s.length > 0
                ? s.map((s) => `${s?.kind} ${s?.key}`).join("|")
                : "Event"
            }
            data-for={"tooltip"}
          ></Handle>
        ))}
        {data.outstream.map((s, index) => (
          <Handle
            key={index}
            type="source"
            position={Position.Right}
            id={"return_" + index}
            style={{
              top: "50%",
              height: "2em",
              zIndex: "900",
              cursor: "pointer",
              //boxShadow: "0px 0px 10px #ff1493",
            }}
            data-tip={
              s && s.length > 0
                ? s.map((s) => `${s?.kind} ${s?.key}`).join("|")
                : "Event"
            }
            data-for={"tooltip"}
          />
        ))}
        <div className="flex flex-row w-full truncate overflow-ellipsis">
          <div
            className="flex-none font-light text-xl mb-1 custom-drag-handle cursor-pointer"
            onDoubleClick={() => toggleExpanded()}
          >
            {node_data?.node?.name}{" "}
          </div>
          <div className="flex-grow"></div>
        </div>
        <p className="text-xs font-extralight truncate">
          {node_data?.node?.description}
        </p>
        {isExpanded && (
          <>
            <div className={"px-2 py-2"}>
              <div className="grid grid-cols-2">
                <div className="w-full">
                  <span className="font-light text-sm ml-2"> Args </span>
                  <div className="grid grid-cols-1">
                    {node_data?.node?.args?.map((arg, index) => (
                      <div
                        key={index}
                        className="border m-1  py-0 px-1 rounded border-gray-200"
                        data-tip={`${arg?.description}`}
                        data-for={"tooltip_special" + id}
                      >
                        <span className="text-xs">{arg?.key}</span> {arg?.label}
                        {arg?.key && (
                          <button onClick={() => rotateArg(arg)}>
                            {data.instream[0]?.find((s) => s?.key === arg?.key)
                              ? "S"
                              : "-"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-full">
                  <span className="font-light text-sm"> Returns </span>
                  <div className="grid grid-cols-1">
                    {node_data?.node?.returns?.map((re, index) => (
                      <div
                        key={index}
                        className="border m-1 py-0 px-1 rounded border-gray-200"
                        data-tip={`${re?.description}`}
                        data-for={"tooltip_special" + id}
                      >
                        {re?.key &&
                          (data.outstream[0]?.find(
                            (s) => s?.key === re?.key
                          ) ? (
                            <button onClick={() => rotateReturn(re)}>
                              Is inside
                            </button>
                          ) : (
                            <button onClick={() => rotateReturn(re)}>
                              Is outside
                            </button>
                          ))}
                        <span className="text-xs">{re?.key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </NodeEditLayout>
    );
  }
);
