import { introspectionFromSchema } from "graphql";
import React, { useEffect, useState } from "react";
import { animation, Item, Menu, Separator } from "react-contexify";
import "react-contexify/dist/ReactContexify.css";
import { Handle, Position, ReactFlowState, useStore } from "reactflow";
import ReactTooltip from "react-tooltip";
import { withRekuest } from "../../../rekuest";
import {
  NodeKind,
  PortFragment,
  useDetailNodeQuery,
} from "../../../rekuest/api/graphql";
import { ConstantsForm } from "../../../rekuest/components/ConstantsForm";
import { useNodeLayout, withLayout } from "../../base/node/layout";
import { ArkitektNodeProps, ConnState, FlowNode } from "../../types";
import { notEmpty, port_to_type as port_to_kind } from "../../utils";
import { useEditRiver } from "../context";
import { additional, NodeEditLayout } from "./layout/NodeEdit";
import { handle_to_index } from "../logic/connect";
import { boolean } from "yup";
import { useArkitektConnState } from "../hooks/useArkitektConnState";

export const ArkitektEditNodeWidget: React.FC<ArkitektNodeProps> = withLayout(
  ({ data, id, isConnectable }) => {
    const { updateNodeIn, updateNodeOut, updateNodeExtras, nodes } =
      useEditRiver();

    const { data: node_data, error } = withRekuest(useDetailNodeQuery)({
      variables: { hash: data.hash },
    });

    const conState = useArkitektConnState(id, nodes);

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

    const rotateArg = (arg: PortFragment) => {
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
              scope: arg.scope,
              kind: port_to_kind(arg),
              identifier: arg.identifier,
              nullable: arg.nullable,
            }),
          ]);
        }
      }
    };

    const rotateReturn = (arg: PortFragment) => {
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
              scope: arg.scope,
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
        connState={conState}
      >
        {data.instream.map((s, index) => (
          <Handle
            key={index}
            type="target"
            className={
              "cursor-pointer" +
              "border-[10px] border-pink-500 shadow-pink-500/5 dark:border-pink-200 dark:shadow-pink-200/10"
            }
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
            data-tip={
              s && s.length > 0
                ? s.map((s) => `${s?.kind} ${s?.key}`).join("|")
                : "Event"
            }
            data-for={"tooltip"}
            isConnectable={conState.isConnectable}
          ></Handle>
        ))}
        {data.outstream.map((s, index) => (
          <Handle
            key={index}
            type="source"
            className={
              "cursor-pointer" +
              "border-[10px] border-pink-500 shadow-pink-500/5 dark:border-pink-200 dark:shadow-pink-200/10"
            }
            position={Position.Right}
            id={"return_" + index}
            style={{
              top: "50%",
              height: "50%",
              zIndex: "-1",
              borderRadius: "3px",
              //boxShadow: "0px 0px 10px #ff1493",
            }}
            data-tip={
              s && s.length > 0
                ? s.map((s) => `${s?.kind} ${s?.key}`).join("|")
                : "Event"
            }
            data-for={"tooltip"}
            isConnectable={conState.isConnectable}
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
                    {node_data?.node?.args
                      ?.filter(notEmpty)
                      .map((arg, index) => {
                        let instream = data.instream[0]?.find(
                          (s) => s?.key === arg?.key
                        );

                        let con = data?.defaults && data.defaults[arg?.key];

                        return (
                          <div
                            key={index}
                            className={`border m-1 py-0 px-1 rounded  ${
                              instream
                                ? "text-gray-800 bg-gray-200 border-gray-200"
                                : "text-gray-200 bg-gray-800 border-gray-900"
                            } `}
                            data-tip={`${arg?.description}`}
                            data-for={"tooltip_special" + id}
                            onClick={() => rotateArg(arg)}
                          >
                            {" "}
                            <div className="flex flex-inline">
                              <span className="flex text-xs my-auto">
                                {arg?.key}
                              </span>{" "}
                              <div className="flex-grow"></div>
                              <div className="text-xs">
                                {arg?.label}
                                {con != undefined && (
                                  <div>{JSON.stringify(con)}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
                <div className="w-full">
                  <span className="font-light text-sm"> Returns </span>
                  <div className="grid grid-cols-1">
                    {node_data?.node?.returns
                      ?.filter(notEmpty)
                      .map((re, index) => {
                        let instream = data.outstream[0]?.find(
                          (s) => s?.key === re?.key
                        );

                        return (
                          <div
                            key={index}
                            className={`border m-1 py-0 px-1 rounded  ${
                              instream
                                ? "text-gray-800 bg-gray-200 border-gray-200"
                                : "text-gray-200 bg-gray-800 border-gray-900"
                            } `}
                            data-tip={`${re?.description}`}
                            data-for={"tooltip_special" + id}
                            onClick={() => rotateReturn(re)}
                          >
                            <div className="flex flex-inline">
                              <span className="flex text-xs my-auto">
                                {re?.key}
                              </span>{" "}
                              <div className="flex-grow"></div>
                              <div className="text-xs">{re?.label}</div>
                            </div>
                          </div>
                        );
                      })}
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
